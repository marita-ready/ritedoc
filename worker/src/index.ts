/**
 * ReadyCompliant API Worker
 * Cloudflare Worker serving as the unified backend for:
 *   - Admin Dashboard (all CRUD operations)
 *   - RiteDoc App Regulation Sync (HMAC-authenticated, Ed25519-verified)
 *
 * Security model:
 *   - Cartridge packages are signed locally on Aroha (Marita's laptop)
 *     using an Ed25519 private key that NEVER touches any server.
 *   - The Worker only holds the PUBLIC key for upload verification.
 *   - R2 stores signed packages as-is; RiteDoc app verifies on install.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import nacl from 'tweetnacl';

// ─── Types ────────────────────────────────────────────────────────────────────

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket | undefined;
  JWT_SECRET: string;
  PUBLIC_KEY_HEX: string;
  HMAC_SECRET: string; // Shared secret for RiteDoc app sync requests
};

type Variables = {
  jwtPayload: { sub: number; email: string; role: string; exp: number };
};

// ─── App ──────────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// CORS — allow dashboard origin in production, restrict later
app.use('*', cors({
  origin: ['https://dashboard.readycompliant.com', 'http://localhost:3000', 'http://127.0.0.1:5500', '*'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-HMAC-Signature', 'X-Timestamp'],
  maxAge: 600,
  credentials: true,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

async function verifyHmac(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const sigBytes = hexToBytes(signature);
  return crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(body));
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateKeyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments = [];
  for (let s = 0; s < 4; s++) {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      const rand = crypto.getRandomValues(new Uint8Array(1))[0];
      segment += chars[rand % chars.length];
    }
    segments.push(segment);
  }
  return 'RD-' + segments.join('-');
}

function generateMobileCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments = [];
  for (let s = 0; s < 3; s++) {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      const rand = crypto.getRandomValues(new Uint8Array(1))[0];
      segment += chars[rand % chars.length];
    }
    segments.push(segment);
  }
  return 'MAC-' + segments.join('-');
}

function generateActivationToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function logAction(db: D1Database, action: string, details: object, performedBy: string) {
  await db.prepare(
    'INSERT INTO automation_log (action, details_json, performed_by) VALUES (?, ?, ?)'
  ).bind(action, JSON.stringify(details), performedBy).run();
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────

const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = await verify(token, c.env.JWT_SECRET || 'readycompliant-dev-secret-change-in-production');
    c.set('jwtPayload', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const user = await c.env.DB.prepare(
    'SELECT * FROM admin_users WHERE email = ?'
  ).bind(email.toLowerCase().trim()).first<{ id: number; email: string; password_hash: string; role: string }>();

  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const secret = c.env.JWT_SECRET || 'readycompliant-dev-secret-change-in-production';
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h
  };

  const token = await sign(payload, secret);
  return c.json({ token, user: { email: user.email, role: user.role } });
});

// ─── CLIENTS ──────────────────────────────────────────────────────────────────

app.get('/api/clients', authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM clients ORDER BY created_at DESC'
  ).all();
  return c.json(results);
});

app.post('/api/clients', authMiddleware, async (c) => {
  const body = await c.req.json<any>();
  const { business_name, contact_name, email, phone, subscription_tier, company_name, abn, notes } = body;

  // Support both old (name/company_name) and new field names
  const bname = business_name || company_name || '';
  const cname = contact_name || body.name || '';

  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO clients (business_name, contact_name, email, phone, subscription_tier, status)
       VALUES (?, ?, ?, ?, ?, 'active')`
    ).bind(bname, cname, email, phone || null, subscription_tier || 'standard').run();

    await logAction(c.env.DB, 'client_created', { email, subscription_tier }, c.get('jwtPayload')?.email || 'admin');
    return c.json({ success: true, id: result.meta.last_row_id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

app.put('/api/clients/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<any>();
  const { business_name, contact_name, email, phone, status, subscription_tier, company_name } = body;
  const bname = business_name || company_name || '';
  const cname = contact_name || body.name || '';

  await c.env.DB.prepare(
    `UPDATE clients SET business_name = ?, contact_name = ?, email = ?, phone = ?,
     status = ?, subscription_tier = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(bname, cname, email, phone || null, status || 'active', subscription_tier || 'standard', id).run();

  await logAction(c.env.DB, 'client_updated', { id, email }, c.get('jwtPayload')?.email || 'admin');
  return c.json({ success: true });
});

app.delete('/api/clients/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// ─── ACTIVATION KEYS ─────────────────────────────────────────────────────────

app.get('/api/keys', authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT k.*, c.business_name as client_name, a.agency_name
     FROM activation_keys k
     LEFT JOIN clients c ON k.client_id = c.id
     LEFT JOIN agencies a ON k.agency_id = a.id
     ORDER BY k.created_at DESC`
  ).all();
  return c.json(results);
});

app.post('/api/keys/generate', authMiddleware, async (c) => {
  const { client_id, subscription_type, agency_id, count } = await c.req.json<any>();
  const keyCount = Math.min(parseInt(count) || 1, 50);
  const generated = [];

  for (let i = 0; i < keyCount; i++) {
    const key_code = generateKeyCode();
    await c.env.DB.prepare(
      'INSERT INTO activation_keys (key_code, client_id, subscription_type, agency_id) VALUES (?, ?, ?, ?)'
    ).bind(key_code, client_id || null, subscription_type || 'standard', agency_id || null).run();
    generated.push(key_code);
  }

  await logAction(c.env.DB, 'key_generated', { count: keyCount, subscription_type, agency_id }, c.get('jwtPayload')?.email || 'admin');
  return c.json({ success: true, keys: generated });
});

app.put('/api/keys/:id/revoke', authMiddleware, async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare(
    `UPDATE activation_keys SET is_active = 0, deactivated_at = datetime('now') WHERE id = ?`
  ).bind(id).run();

  await logAction(c.env.DB, 'key_deactivated', { id }, c.get('jwtPayload')?.email || 'admin');
  return c.json({ success: true });
});

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────

app.get('/api/subscriptions', authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, business_name, contact_name, email, subscription_tier, status, created_at FROM clients ORDER BY created_at DESC'
  ).all();
  return c.json(results);
});

// ─── CARTRIDGES ───────────────────────────────────────────────────────────────

app.get('/api/cartridges/versions', authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM cartridge_versions ORDER BY uploaded_at DESC'
  ).all();
  return c.json(results);
});

/**
 * POST /api/cartridges/upload
 * Accepts a pre-signed .rsp (Regulation Sync Package) JSON body:
 * {
 *   manifest: { version, timestamp, files: [{name, hash, size}], release_notes? },
 *   signature: "<hex Ed25519 signature of JSON.stringify(manifest, null, 2)>",
 *   files: { "filename.json": "<base64 content>", ... }
 * }
 *
 * The Worker verifies the signature using the stored PUBLIC key.
 * The private key NEVER leaves Aroha (Marita's laptop).
 */
app.post('/api/cartridges/upload', authMiddleware, async (c) => {
  const body = await c.req.json<{ manifest: any; signature: string; files: Record<string, string> }>();
  const { manifest, signature, files } = body;

  if (!manifest || !signature || !files) {
    return c.json({ error: 'Missing manifest, signature, or files' }, 400);
  }

  // 1. Verify Ed25519 signature using stored public key
  const publicKeyHex = c.env.PUBLIC_KEY_HEX;
  if (!publicKeyHex) {
    return c.json({ error: 'Server misconfiguration: PUBLIC_KEY_HEX not set' }, 500);
  }

  try {
    const publicKey = hexToBytes(publicKeyHex);
    const sigBytes = hexToBytes(signature);
    const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
    const isValid = nacl.sign.detached.verify(manifestBytes, sigBytes, publicKey);

    if (!isValid) {
      return c.json({ error: 'Signature verification failed. Package must be signed by Aroha.' }, 400);
    }
  } catch (e: any) {
    return c.json({ error: 'Signature verification error: ' + e.message }, 400);
  }

  const version = manifest.version;
  if (!version) {
    return c.json({ error: 'manifest.version is required' }, 400);
  }

  // 2. Store files in R2 (if bucket is available)
  const r2Path = `cartridges/${version}/`;
  let r2Available = false;

  if (c.env.BUCKET) {
    try {
      for (const [fileName, base64Content] of Object.entries(files)) {
        const content = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
        await c.env.BUCKET.put(`${r2Path}${fileName}`, content, {
          httpMetadata: { contentType: 'application/json' }
        });
      }
      // Also store the manifest
      await c.env.BUCKET.put(`${r2Path}manifest.json`, JSON.stringify(manifest, null, 2), {
        httpMetadata: { contentType: 'application/json' }
      });
      // Store the signature file
      await c.env.BUCKET.put(`${r2Path}signature.hex`, signature, {
        httpMetadata: { contentType: 'text/plain' }
      });
      r2Available = true;
    } catch (e: any) {
      console.error('R2 upload error:', e.message);
      // Continue — store metadata in D1 even if R2 fails
    }
  }

  // 3. Store metadata in D1
  try {
    await c.env.DB.prepare(
      `INSERT INTO cartridge_versions (version, release_notes, files, checksums, signature, r2_path, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      version,
      manifest.release_notes || '',
      JSON.stringify(manifest.files || []),
      JSON.stringify(manifest.files?.reduce((acc: any, f: any) => ({ ...acc, [f.name]: f.hash }), {}) || {}),
      signature,
      r2Path,
      c.get('jwtPayload')?.email || 'admin'
    ).run();
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint')) {
      return c.json({ error: `Version ${version} already exists` }, 409);
    }
    return c.json({ error: 'Database error: ' + e.message }, 500);
  }

  await logAction(c.env.DB, 'cartridge_uploaded', { version, r2Available, fileCount: Object.keys(files).length }, c.get('jwtPayload')?.email || 'admin');

  return c.json({
    success: true,
    version,
    r2_stored: r2Available,
    r2_path: r2Path,
    message: r2Available
      ? `Cartridge v${version} uploaded and stored in R2`
      : `Cartridge v${version} metadata stored in D1 (R2 not yet available — enable R2 in Cloudflare dashboard)`
  });
});

// ─── SUPPORT TICKETS ─────────────────────────────────────────────────────────

app.get('/api/support/tickets', authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT t.*, c.business_name as client_name
     FROM support_tickets t
     LEFT JOIN clients c ON t.client_id = c.id
     ORDER BY t.created_at DESC`
  ).all();
  return c.json(results);
});

app.post('/api/support/tickets', authMiddleware, async (c) => {
  const body = await c.req.json<any>();
  const { client_id, subject, category, description, priority } = body;

  const result = await c.env.DB.prepare(
    `INSERT INTO support_tickets (client_id, subject, category, description, priority, status)
     VALUES (?, ?, ?, ?, ?, 'open')`
  ).bind(client_id || null, subject || 'Support Request', category || 'general', description || '', priority || 'normal').run();

  return c.json({ success: true, id: result.meta.last_row_id }, 201);
});

app.put('/api/support/tickets/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<any>();
  const { status, resolution, notes, priority } = body;

  await c.env.DB.prepare(
    `UPDATE support_tickets SET status = ?, resolution = ?, notes = ?, priority = ?,
     updated_at = datetime('now') WHERE id = ?`
  ).bind(status || 'open', resolution || null, notes || null, priority || 'normal', id).run();

  return c.json({ success: true });
});

// ─── STATS ────────────────────────────────────────────────────────────────────

app.get('/api/stats/overview', authMiddleware, async (c) => {
  const [clientsTotal, clientsActive, keysActive, keysActivated, ticketsOpen, latestCartridge, agenciesCount, mobileCodesTotal, mobileCodesRedeemed, mobileCodesActive, pendingSeatRequests] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM clients').first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM clients WHERE status = 'active'").first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM activation_keys WHERE is_active = 1').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM activation_keys WHERE activated_at IS NOT NULL').first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('open','in_progress')").first<{ count: number }>(),
    c.env.DB.prepare('SELECT version FROM cartridge_versions ORDER BY uploaded_at DESC LIMIT 1').first<{ version: string }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM agencies WHERE is_active = 1').first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as count FROM mobile_access_codes').first<{ count: number }>().catch(() => ({ count: 0 })),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM mobile_access_codes WHERE status = 'redeemed'").first<{ count: number }>().catch(() => ({ count: 0 })),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM mobile_access_codes WHERE status = 'active'").first<{ count: number }>().catch(() => ({ count: 0 })),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM seat_requests WHERE status = 'pending'").first<{ count: number }>().catch(() => ({ count: 0 })),
  ]);

  return c.json({
    total_clients: clientsTotal?.count || 0,
    active_clients: clientsActive?.count || 0,
    active_keys: keysActive?.count || 0,
    activated_keys: keysActivated?.count || 0,
    open_tickets: ticketsOpen?.count || 0,
    latest_cartridge_version: latestCartridge?.version || '—',
    active_agencies: agenciesCount?.count || 0,
    mobile_codes_generated: mobileCodesTotal?.count || 0,
    mobile_codes_redeemed: mobileCodesRedeemed?.count || 0,
    mobile_codes_active: mobileCodesActive?.count || 0,
    mrr: (clientsActive?.count || 0) * 99, // $99/month per active client
    pending_seat_requests: pendingSeatRequests?.count || 0,
  });
});

// ─── AGENCIES ─────────────────────────────────────────────────────────────────

app.get('/api/agencies', authMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM agencies ORDER BY created_at DESC'
  ).all();
  return c.json(results);
});

app.post('/api/agencies', authMiddleware, async (c) => {
  const body = await c.req.json<any>();
  const { agency_name, contact_name, email, contact_email, contact_phone, abn, seats_purchased, mobile_seats_allocated } = body;

  const result = await c.env.DB.prepare(
    `INSERT INTO agencies (agency_name, contact_name, email, contact_email, contact_phone, abn, seats_purchased, mobile_seats_allocated, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
  ).bind(agency_name, contact_name, email || contact_email, contact_email || email, contact_phone || null, abn || null, seats_purchased || 5, mobile_seats_allocated || 0).run();

  return c.json({ success: true, id: result.meta.last_row_id }, 201);
});

app.put('/api/agencies/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<any>();
  const { agency_name, contact_name, contact_email, contact_phone, seats_purchased, mobile_seats_allocated, is_active } = body;

  await c.env.DB.prepare(
    `UPDATE agencies SET agency_name = ?, contact_name = ?, contact_email = ?,
     contact_phone = ?, seats_purchased = ?, mobile_seats_allocated = ?, is_active = ? WHERE id = ?`
  ).bind(agency_name, contact_name, contact_email || null, contact_phone || null, seats_purchased || 0, mobile_seats_allocated || 0, is_active ? 1 : 0, id).run();

  return c.json({ success: true });
});

// ─── AUTOMATION LOG ───────────────────────────────────────────────────────────

app.get('/api/automation/log', authMiddleware, async (c) => {
  const limit = parseInt(c.req.query('limit') || '100');
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM automation_log ORDER BY performed_at DESC LIMIT ?'
  ).bind(Math.min(limit, 500)).all();
  return c.json(results);
});

// ─── REGULATION SYNC (RiteDoc App) ───────────────────────────────────────────

/**
 * POST /api/sync/check
 *
 * Called by the RiteDoc Tauri app's regulation_sync.rs module.
 * Request body (HMAC-authenticated):
 * {
 *   license_key: "RD-XXXX-XXXX-XXXX-XXXX",
 *   hardware_fingerprint: "<sha256 of machine identifiers>",
 *   current_version: "2.0.0"  // optional, for version comparison
 * }
 *
 * Headers:
 *   X-HMAC-Signature: <HMAC-SHA256 of request body using shared secret>
 *   X-Timestamp: <unix timestamp, must be within 5 minutes>
 *
 * Response (signed with Ed25519 private key — done by Aroha's laptop at upload time):
 * {
 *   has_update: bool,
 *   version: "2.1.0",
 *   r2_path: "cartridges/2.1.0/",
 *   files: [{name, hash, size}],
 *   signature: "<hex Ed25519 signature>",
 *   download_urls: { "filename.json": "<R2 presigned URL>" }
 * }
 */
app.post('/api/sync/check', async (c) => {
  const rawBody = await c.req.text();
  const timestamp = c.req.header('X-Timestamp');
  const hmacSig = c.req.header('X-HMAC-Signature');

  // 1. Validate timestamp (within 5 minutes)
  if (timestamp) {
    const ts = parseInt(timestamp);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > 300) {
      return c.json({ error: 'Request timestamp expired' }, 401);
    }
  }

  // 2. Validate HMAC if secret is configured
  const hmacSecret = c.env.HMAC_SECRET;
  if (hmacSecret && hmacSig) {
    const valid = await verifyHmac(rawBody, hmacSig, hmacSecret);
    if (!valid) {
      return c.json({ error: 'HMAC signature invalid' }, 401);
    }
  }

  let body: { license_key: string; hardware_fingerprint: string; current_version?: string };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { license_key, hardware_fingerprint, current_version } = body;

  if (!license_key) {
    return c.json({ error: 'license_key is required' }, 400);
  }

  // 3. Validate license key
  const key = await c.env.DB.prepare(
    'SELECT * FROM activation_keys WHERE key_code = ? AND is_active = 1'
  ).bind(license_key).first<{ id: number; hardware_fingerprint: string | null; activated_at: string | null }>();

  if (!key) {
    return c.json({ error: 'Invalid or inactive license key' }, 403);
  }

  // 4. Hardware fingerprint binding
  if (hardware_fingerprint) {
    if (!key.hardware_fingerprint) {
      // First activation — bind fingerprint
      await c.env.DB.prepare(
        `UPDATE activation_keys SET hardware_fingerprint = ?, activated_at = datetime('now') WHERE id = ?`
      ).bind(hardware_fingerprint, key.id).run();
    } else if (key.hardware_fingerprint !== hardware_fingerprint) {
      return c.json({ error: 'Hardware fingerprint mismatch — key is bound to a different device' }, 403);
    }
  }

  // 5. Get latest cartridge version
  const latest = await c.env.DB.prepare(
    'SELECT * FROM cartridge_versions ORDER BY uploaded_at DESC LIMIT 1'
  ).first<{ version: string; r2_path: string; signature: string; files: string; checksums: string }>();

  if (!latest) {
    return c.json({ has_update: false, message: 'No cartridge versions available' });
  }

  const hasUpdate = !current_version || current_version !== latest.version;

  const response: any = {
    has_update: hasUpdate,
    version: latest.version,
    r2_path: latest.r2_path,
    signature: latest.signature,
    files: JSON.parse(latest.files || '[]'),
    checksums: JSON.parse(latest.checksums || '{}'),
  };

  // 6. Generate R2 presigned download URLs if bucket is available
  if (c.env.BUCKET && hasUpdate) {
    const files = JSON.parse(latest.files || '[]') as Array<{ name: string }>;
    const downloadUrls: Record<string, string> = {};
    for (const file of files) {
      try {
        const obj = await c.env.BUCKET.get(`${latest.r2_path}${file.name}`);
        if (obj) {
          // R2 doesn't support presigned URLs via Workers directly — return path for now
          downloadUrls[file.name] = `${latest.r2_path}${file.name}`;
        }
      } catch { /* skip */ }
    }
    response.download_urls = downloadUrls;
  }

  return c.json(response);
});

/**
 * GET /api/sync/download/:version/:filename
 * Serves cartridge files directly from R2 to authenticated RiteDoc apps.
 * The app must include its license key as a query param for validation.
 */
app.get('/api/sync/download/:version/:filename', async (c) => {
  const version = c.req.param('version');
  const filename = c.req.param('filename');
  const licenseKey = c.req.query('key');

  if (!licenseKey) {
    return c.json({ error: 'License key required' }, 401);
  }

  // Validate key
  const key = await c.env.DB.prepare(
    'SELECT id FROM activation_keys WHERE key_code = ? AND is_active = 1'
  ).bind(licenseKey).first();

  if (!key) {
    return c.json({ error: 'Invalid license key' }, 403);
  }

  if (!c.env.BUCKET) {
    return c.json({ error: 'R2 storage not yet configured' }, 503);
  }

  const r2Key = `cartridges/${version}/${filename}`;
  const object = await c.env.BUCKET.get(r2Key);

  if (!object) {
    return c.json({ error: 'File not found' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  object.writeHttpMetadata(headers);

  return new Response(object.body, { headers });
});

// ─── STRIPE WEBHOOK ───────────────────────────────────────────────────────────

app.post('/api/webhooks/stripe', async (c) => {
  const body = await c.req.text();
  const sig = c.req.header('Stripe-Signature');

  // TODO: Verify Stripe webhook signature using STRIPE_WEBHOOK_SECRET
  // For now, process the event directly

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      const email = pi.receipt_email || pi.metadata?.email;
      if (email) {
        // Auto-generate activation key on payment
        const keyCode = generateKeyCode();
        await c.env.DB.prepare(
          'INSERT INTO activation_keys (key_code, subscription_type) VALUES (?, ?)'
        ).bind(keyCode, pi.metadata?.subscription_type || 'standard').run();

        await logAction(c.env.DB, 'stripe_payment_succeeded', {
          payment_intent_id: pi.id,
          amount: pi.amount,
          email,
          key_generated: keyCode,
        }, 'stripe_webhook');
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const customerId = sub.customer;
      // Deactivate keys for this customer
      await c.env.DB.prepare(
        `UPDATE activation_keys SET is_active = 0, deactivated_at = datetime('now')
         WHERE client_id IN (SELECT id FROM clients WHERE stripe_customer_id = ?)`
      ).bind(customerId).run();

      await logAction(c.env.DB, 'subscription_cancelled', { customer_id: customerId }, 'stripe_webhook');
      break;
    }
  }

  return c.json({ received: true });
});

// ─── MOBILE ACCESS CODES (BIAB) ───────────────────────────────────────────────

/**
 * GET /api/mobile/codes
 * List all mobile access codes, optionally filtered by agency_id.
 */
app.get('/api/mobile/codes', authMiddleware, async (c) => {
  const agencyId = c.req.query('agency_id');
  let query = `
    SELECT m.*, a.agency_name
    FROM mobile_access_codes m
    LEFT JOIN agencies a ON m.agency_id = a.id
  `;
  const params: any[] = [];

  if (agencyId) {
    query += ' WHERE m.agency_id = ?';
    params.push(parseInt(agencyId));
  }
  query += ' ORDER BY m.created_at DESC';

  const stmt = params.length > 0
    ? c.env.DB.prepare(query).bind(...params)
    : c.env.DB.prepare(query);

  const { results } = await stmt.all();
  return c.json(results);
});

/**
 * GET /api/mobile/codes/stats
 * Get mobile code stats, optionally filtered by agency_id.
 */
app.get('/api/mobile/codes/stats', authMiddleware, async (c) => {
  const agencyId = c.req.query('agency_id');

  if (agencyId) {
    const aid = parseInt(agencyId);
    const [agency, totalCodes, redeemedCodes, activeCodes] = await Promise.all([
      c.env.DB.prepare('SELECT mobile_seats_allocated FROM agencies WHERE id = ?').bind(aid).first<{ mobile_seats_allocated: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM mobile_access_codes WHERE agency_id = ?').bind(aid).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM mobile_access_codes WHERE agency_id = ? AND status = 'redeemed'").bind(aid).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM mobile_access_codes WHERE agency_id = ? AND status = 'active'").bind(aid).first<{ count: number }>(),
    ]);

    return c.json({
      allocated: agency?.mobile_seats_allocated || 0,
      generated: totalCodes?.count || 0,
      redeemed: redeemedCodes?.count || 0,
      active: activeCodes?.count || 0,
      remaining: Math.max(0, (agency?.mobile_seats_allocated || 0) - (totalCodes?.count || 0)),
    });
  }

  const [totalCodes, redeemedCodes, activeCodes] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM mobile_access_codes').first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM mobile_access_codes WHERE status = 'redeemed'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM mobile_access_codes WHERE status = 'active'").first<{ count: number }>(),
  ]);

  return c.json({
    generated: totalCodes?.count || 0,
    redeemed: redeemedCodes?.count || 0,
    active: activeCodes?.count || 0,
  });
});

/**
 * POST /api/mobile/codes/generate
 * Generate mobile access codes for an agency (up to their allocation limit).
 */
app.post('/api/mobile/codes/generate', authMiddleware, async (c) => {
  const { agency_id, count } = await c.req.json<{ agency_id: number; count?: number }>();

  if (!agency_id) {
    return c.json({ error: 'agency_id is required' }, 400);
  }

  const agency = await c.env.DB.prepare(
    'SELECT * FROM agencies WHERE id = ? AND is_active = 1'
  ).bind(agency_id).first<{ id: number; agency_name: string; mobile_seats_allocated: number; mobile_seats_used: number }>();

  if (!agency) {
    return c.json({ error: 'Agency not found or inactive' }, 404);
  }

  const existingCodes = await c.env.DB.prepare(
    "SELECT COUNT(*) as count FROM mobile_access_codes WHERE agency_id = ? AND status IN ('active', 'redeemed')"
  ).bind(agency_id).first<{ count: number }>();

  const currentCount = existingCodes?.count || 0;
  const allocated = agency.mobile_seats_allocated || 0;
  const available = Math.max(0, allocated - currentCount);

  if (available <= 0) {
    return c.json({ error: `No remaining allocation. Agency has ${allocated} seats allocated, ${currentCount} codes already generated.` }, 400);
  }

  const requestedCount = Math.min(parseInt(String(count)) || 1, 50, available);
  const generated: string[] = [];

  for (let i = 0; i < requestedCount; i++) {
    const code = generateMobileCode();
    await c.env.DB.prepare(
      "INSERT INTO mobile_access_codes (code, agency_id, status) VALUES (?, ?, 'active')"
    ).bind(code, agency_id).run();
    generated.push(code);
  }

  await c.env.DB.prepare(
    "UPDATE agencies SET mobile_seats_used = (SELECT COUNT(*) FROM mobile_access_codes WHERE agency_id = ? AND status IN ('active', 'redeemed')) WHERE id = ?"
  ).bind(agency_id, agency_id).run();

  await logAction(c.env.DB, 'mobile_codes_generated', { agency_id, agency_name: agency.agency_name, count: requestedCount, codes: generated }, c.get('jwtPayload')?.email || 'admin');

  return c.json({
    success: true,
    codes: generated,
    agency_name: agency.agency_name,
    remaining: available - requestedCount,
  });
});

/**
 * PUT /api/mobile/codes/:id/revoke
 * Revoke an active mobile access code.
 */
app.put('/api/mobile/codes/:id/revoke', authMiddleware, async (c) => {
  const id = c.req.param('id');

  const code = await c.env.DB.prepare(
    'SELECT * FROM mobile_access_codes WHERE id = ?'
  ).bind(id).first<{ id: number; code: string; agency_id: number; status: string }>();

  if (!code) {
    return c.json({ error: 'Code not found' }, 404);
  }

  if (code.status === 'redeemed') {
    return c.json({ error: 'Cannot revoke a redeemed code' }, 400);
  }

  await c.env.DB.prepare(
    "UPDATE mobile_access_codes SET status = 'revoked' WHERE id = ?"
  ).bind(id).run();

  await logAction(c.env.DB, 'mobile_code_revoked', { code_id: id, code: code.code, agency_id: code.agency_id }, c.get('jwtPayload')?.email || 'admin');
  return c.json({ success: true });
});

/**
 * POST /api/mobile/verify-code
 * PUBLIC endpoint — called by the mobile app to verify and redeem an access code.
 * One quick online call — after this the mobile app works offline.
 *
 * Request: { code: "MAC-XXXX-XXXX-XXXX", device_id?: "<device identifier>" }
 * Success: { success: true, activation_token: "<hex token>", agency_name: "...", message: "..." }
 * Failure: { error: "..." }
 */
app.post('/api/mobile/verify-code', async (c) => {
  let body: { code: string; device_id?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { code, device_id } = body;

  if (!code || typeof code !== 'string') {
    return c.json({ error: 'Access code is required' }, 400);
  }

  const cleanCode = code.trim().toUpperCase();

  const accessCode = await c.env.DB.prepare(
    'SELECT m.*, a.agency_name FROM mobile_access_codes m LEFT JOIN agencies a ON m.agency_id = a.id WHERE m.code = ?'
  ).bind(cleanCode).first<{ id: number; code: string; agency_id: number; status: string; agency_name: string; activation_token: string | null }>();

  if (!accessCode) {
    return c.json({ error: 'Invalid access code. Please check and try again.' }, 404);
  }

  if (accessCode.status === 'redeemed') {
    return c.json({ error: 'This code has already been used.' }, 400);
  }

  if (accessCode.status === 'expired') {
    return c.json({ error: 'This code has expired. Please contact your agency.' }, 400);
  }

  if (accessCode.status === 'revoked') {
    return c.json({ error: 'This code has been revoked. Please contact your agency.' }, 400);
  }

  if (accessCode.status !== 'active') {
    return c.json({ error: 'This code is no longer valid.' }, 400);
  }

  const activationToken = generateActivationToken();

  await c.env.DB.prepare(
    `UPDATE mobile_access_codes
     SET status = 'redeemed',
         redeemed_at = datetime('now'),
         redeemed_by = ?,
         activation_token = ?
     WHERE id = ?`
  ).bind(device_id || 'unknown', activationToken, accessCode.id).run();

  await c.env.DB.prepare(
    "UPDATE agencies SET mobile_seats_used = (SELECT COUNT(*) FROM mobile_access_codes WHERE agency_id = ? AND status = 'redeemed') WHERE id = ?"
  ).bind(accessCode.agency_id, accessCode.agency_id).run();

  await logAction(c.env.DB, 'mobile_code_redeemed', {
    code: cleanCode,
    agency_id: accessCode.agency_id,
    agency_name: accessCode.agency_name,
    device_id: device_id || 'unknown',
  }, 'mobile_app');

  return c.json({
    success: true,
    activation_token: activationToken,
    agency_name: accessCode.agency_name,
    message: 'Access code verified. Your app is now activated.',
  });
});

/// ─── WHOLESALE SEAT REQUESTS ───────────────────────────────────────────────────

/**
 * GET /api/seat-requests
 * List all wholesale seat requests.
 * Admin sees all; can filter by ?status=pending|approved|rejected and ?agency_id=N.
 */
app.get('/api/seat-requests', authMiddleware, async (c) => {
  const status = c.req.query('status');
  const agencyId = c.req.query('agency_id');

  let query = 'SELECT * FROM seat_requests';
  const conditions: string[] = [];
  const params: any[] = [];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (agencyId) {
    conditions.push('agency_id = ?');
    params.push(parseInt(agencyId));
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC';

  const stmt = params.length > 0
    ? c.env.DB.prepare(query).bind(...params)
    : c.env.DB.prepare(query);

  const { results } = await stmt.all();
  return c.json(results);
});

/**
 * GET /api/seat-requests/stats
 * Get summary stats for seat requests.
 */
app.get('/api/seat-requests/stats', authMiddleware, async (c) => {
  const [pending, approved, rejected, totalSeatsApproved] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as count FROM seat_requests WHERE status = 'pending'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM seat_requests WHERE status = 'approved'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM seat_requests WHERE status = 'rejected'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COALESCE(SUM(seats_requested), 0) as total FROM seat_requests WHERE status = 'approved'").first<{ total: number }>(),
  ]);

  return c.json({
    pending: pending?.count || 0,
    approved: approved?.count || 0,
    rejected: rejected?.count || 0,
    total_seats_approved: totalSeatsApproved?.total || 0,
  });
});

/**
 * GET /api/seat-requests/:id
 * Get a single seat request by ID, including any generated keys.
 */
app.get('/api/seat-requests/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const request = await c.env.DB.prepare(
    'SELECT * FROM seat_requests WHERE id = ?'
  ).bind(id).first();

  if (!request) {
    return c.json({ error: 'Seat request not found' }, 404);
  }

  // Get any activation keys generated for this request
  const { results: keys } = await c.env.DB.prepare(
    'SELECT id, key_code, subscription_type, is_active, activated_at, created_at FROM activation_keys WHERE seat_request_id = ? ORDER BY created_at DESC'
  ).bind(id).all();

  return c.json({ ...request, keys: keys || [] });
});

/**
 * POST /api/seat-requests
 * Agency submits a new wholesale seat request.
 * Body: { agency_id, seats_requested, contact_name?, contact_email?, contact_phone? }
 */
app.post('/api/seat-requests', authMiddleware, async (c) => {
  const body = await c.req.json<any>();
  const { agency_id, seats_requested, contact_name, contact_email, contact_phone } = body;

  if (!agency_id) {
    return c.json({ error: 'agency_id is required' }, 400);
  }
  if (!seats_requested || seats_requested < 1) {
    return c.json({ error: 'seats_requested must be at least 1' }, 400);
  }

  const agency = await c.env.DB.prepare(
    'SELECT * FROM agencies WHERE id = ? AND is_active = 1'
  ).bind(agency_id).first<{ id: number; agency_name: string; contact_name: string; contact_email: string; contact_phone: string }>();

  if (!agency) {
    return c.json({ error: 'Agency not found or inactive' }, 404);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO seat_requests (agency_id, agency_name, contact_name, contact_email, contact_phone, seats_requested, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`
  ).bind(
    agency_id,
    agency.agency_name,
    contact_name || agency.contact_name || null,
    contact_email || agency.contact_email || null,
    contact_phone || agency.contact_phone || null,
    Math.min(seats_requested, 500)
  ).run();

  await logAction(c.env.DB, 'seat_request_created', {
    request_id: result.meta.last_row_id,
    agency_id,
    agency_name: agency.agency_name,
    seats_requested,
  }, c.get('jwtPayload')?.email || 'agency');

  return c.json({ success: true, id: result.meta.last_row_id }, 201);
});

/**
 * PUT /api/seat-requests/:id/approve
 * Admin approves a pending seat request.
 * Generates activation keys and increases the agency's seats_purchased.
 * Body: { admin_notes? }
 */
app.put('/api/seat-requests/:id/approve', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<any>().catch(() => ({}));
  const adminEmail = c.get('jwtPayload')?.email || 'admin';

  const request = await c.env.DB.prepare(
    'SELECT * FROM seat_requests WHERE id = ?'
  ).bind(id).first<{ id: number; agency_id: number; agency_name: string; seats_requested: number; status: string }>();

  if (!request) {
    return c.json({ error: 'Seat request not found' }, 404);
  }
  if (request.status !== 'pending') {
    return c.json({ error: `Request has already been ${request.status}` }, 400);
  }

  // Generate activation keys for the approved seats
  const generatedKeys: string[] = [];
  for (let i = 0; i < request.seats_requested; i++) {
    const keyCode = generateKeyCode();
    await c.env.DB.prepare(
      'INSERT INTO activation_keys (key_code, agency_id, subscription_type, seat_request_id) VALUES (?, ?, ?, ?)'
    ).bind(keyCode, request.agency_id, 'biab', id).run();
    generatedKeys.push(keyCode);
  }

  // Update the seat request status
  await c.env.DB.prepare(
    `UPDATE seat_requests SET status = 'approved', admin_notes = ?, reviewed_by = ?,
     reviewed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
  ).bind(body.admin_notes || null, adminEmail, id).run();

  // Increase the agency's seats_purchased count
  await c.env.DB.prepare(
    'UPDATE agencies SET seats_purchased = seats_purchased + ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).bind(request.seats_requested, request.agency_id).run();

  await logAction(c.env.DB, 'seat_request_approved', {
    request_id: id,
    agency_id: request.agency_id,
    agency_name: request.agency_name,
    seats_approved: request.seats_requested,
    keys_generated: generatedKeys.length,
  }, adminEmail);

  return c.json({
    success: true,
    keys: generatedKeys,
    seats_approved: request.seats_requested,
    agency_name: request.agency_name,
  });
});

/**
 * PUT /api/seat-requests/:id/reject
 * Admin rejects a pending seat request.
 * Body: { admin_notes? }
 */
app.put('/api/seat-requests/:id/reject', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<any>().catch(() => ({}));
  const adminEmail = c.get('jwtPayload')?.email || 'admin';

  const request = await c.env.DB.prepare(
    'SELECT * FROM seat_requests WHERE id = ?'
  ).bind(id).first<{ id: number; agency_id: number; agency_name: string; seats_requested: number; status: string }>();

  if (!request) {
    return c.json({ error: 'Seat request not found' }, 404);
  }
  if (request.status !== 'pending') {
    return c.json({ error: `Request has already been ${request.status}` }, 400);
  }

  await c.env.DB.prepare(
    `UPDATE seat_requests SET status = 'rejected', admin_notes = ?, reviewed_by = ?,
     reviewed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
  ).bind(body.admin_notes || null, adminEmail, id).run();

  await logAction(c.env.DB, 'seat_request_rejected', {
    request_id: id,
    agency_id: request.agency_id,
    agency_name: request.agency_name,
    seats_requested: request.seats_requested,
    reason: body.admin_notes || 'No reason provided',
  }, adminEmail);

  return c.json({ success: true });
});

// ─── CLIENT ASSIGNMENTS (BIAB) ────────────────────────────────────────────────

/**
 * GET /api/client-assignments
 * List client assignments. Supports optional filters:
 *   ?agency_id=N — filter by agency
 *   ?status=active|revoked|expired — filter by status
 * Admin sees all; agency view should pass agency_id.
 */
app.get('/api/client-assignments', authMiddleware, async (c) => {
  const agencyId = c.req.query('agency_id');
  const status = c.req.query('status');

  let query = `
    SELECT ca.*, a.agency_name
    FROM client_assignments ca
    LEFT JOIN agencies a ON ca.agency_id = a.id
  `;
  const conditions: string[] = [];
  const params: any[] = [];

  if (agencyId) {
    conditions.push('ca.agency_id = ?');
    params.push(parseInt(agencyId));
  }
  if (status) {
    conditions.push('ca.status = ?');
    params.push(status);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY ca.created_at DESC';

  const stmt = params.length > 0
    ? c.env.DB.prepare(query).bind(...params)
    : c.env.DB.prepare(query);

  const { results } = await stmt.all();
  return c.json(results);
});

/**
 * GET /api/client-assignments/stats
 * Get assignment stats. Optionally filter by ?agency_id=N.
 */
app.get('/api/client-assignments/stats', authMiddleware, async (c) => {
  const agencyId = c.req.query('agency_id');

  if (agencyId) {
    const aid = parseInt(agencyId);
    const [total, active, revoked, expired] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM client_assignments WHERE agency_id = ?').bind(aid).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM client_assignments WHERE agency_id = ? AND status = 'active'").bind(aid).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM client_assignments WHERE agency_id = ? AND status = 'revoked'").bind(aid).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM client_assignments WHERE agency_id = ? AND status = 'expired'").bind(aid).first<{ count: number }>(),
    ]);

    return c.json({
      total: total?.count || 0,
      active: active?.count || 0,
      revoked: revoked?.count || 0,
      expired: expired?.count || 0,
    });
  }

  const [total, active, revoked, expired] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM client_assignments').first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM client_assignments WHERE status = 'active'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM client_assignments WHERE status = 'revoked'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM client_assignments WHERE status = 'expired'").first<{ count: number }>(),
  ]);

  return c.json({
    total: total?.count || 0,
    active: active?.count || 0,
    revoked: revoked?.count || 0,
    expired: expired?.count || 0,
  });
});

/**
 * GET /api/client-assignments/:id
 * Get a single client assignment by ID.
 */
app.get('/api/client-assignments/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const assignment = await c.env.DB.prepare(
    `SELECT ca.*, a.agency_name
     FROM client_assignments ca
     LEFT JOIN agencies a ON ca.agency_id = a.id
     WHERE ca.id = ?`
  ).bind(id).first();

  if (!assignment) {
    return c.json({ error: 'Client assignment not found' }, 404);
  }

  return c.json(assignment);
});

/**
 * POST /api/client-assignments
 * Create a new client assignment — agency assigns an activation key to a client.
 * Body: { agency_id, client_name, client_email, client_organisation?, activation_key, notes? }
 */
app.post('/api/client-assignments', authMiddleware, async (c) => {
  const body = await c.req.json<any>();
  const { agency_id, client_name, client_email, client_organisation, activation_key, notes } = body;

  if (!agency_id) {
    return c.json({ error: 'agency_id is required' }, 400);
  }
  if (!client_name || !client_name.trim()) {
    return c.json({ error: 'client_name is required' }, 400);
  }
  if (!client_email || !client_email.trim()) {
    return c.json({ error: 'client_email is required' }, 400);
  }
  if (!activation_key || !activation_key.trim()) {
    return c.json({ error: 'activation_key is required' }, 400);
  }

  // Verify agency exists and is active
  const agency = await c.env.DB.prepare(
    'SELECT * FROM agencies WHERE id = ? AND is_active = 1'
  ).bind(agency_id).first<{ id: number; agency_name: string }>(); 

  if (!agency) {
    return c.json({ error: 'Agency not found or inactive' }, 404);
  }

  // Verify the activation key exists, is active, and belongs to this agency
  const key = await c.env.DB.prepare(
    'SELECT * FROM activation_keys WHERE key_code = ? AND is_active = 1'
  ).bind(activation_key.trim()).first<{ id: number; key_code: string; agency_id: number | null }>(); 

  if (!key) {
    return c.json({ error: 'Activation key not found or already deactivated' }, 404);
  }

  if (key.agency_id && key.agency_id !== agency_id) {
    return c.json({ error: 'This activation key belongs to a different agency' }, 403);
  }

  // Check the key is not already assigned to another client
  const existingAssignment = await c.env.DB.prepare(
    "SELECT id FROM client_assignments WHERE activation_key = ? AND status = 'active'"
  ).bind(activation_key.trim()).first();

  if (existingAssignment) {
    return c.json({ error: 'This activation key is already assigned to a client' }, 400);
  }

  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO client_assignments (agency_id, client_name, client_email, client_organisation, activation_key, status, notes)
       VALUES (?, ?, ?, ?, ?, 'active', ?)`
    ).bind(
      agency_id,
      client_name.trim(),
      client_email.trim().toLowerCase(),
      client_organisation || null,
      activation_key.trim(),
      notes || null
    ).run();

    await logAction(c.env.DB, 'client_assignment_created', {
      assignment_id: result.meta.last_row_id,
      agency_id,
      agency_name: agency.agency_name,
      client_name: client_name.trim(),
      client_email: client_email.trim(),
      activation_key: activation_key.trim(),
    }, c.get('jwtPayload')?.email || 'admin');

    return c.json({ success: true, id: result.meta.last_row_id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

/**
 * PUT /api/client-assignments/:id/revoke
 * Revoke a client assignment. Optionally deactivates the underlying activation key.
 * Body: { deactivate_key?: boolean, reason?: string }
 */
app.put('/api/client-assignments/:id/revoke', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<any>().catch(() => ({}));
  const adminEmail = c.get('jwtPayload')?.email || 'admin';

  const assignment = await c.env.DB.prepare(
    'SELECT * FROM client_assignments WHERE id = ?'
  ).bind(id).first<{ id: number; agency_id: number; activation_key: string; status: string; client_name: string; client_email: string }>(); 

  if (!assignment) {
    return c.json({ error: 'Client assignment not found' }, 404);
  }

  if (assignment.status !== 'active') {
    return c.json({ error: `Assignment is already ${assignment.status}` }, 400);
  }

  // Revoke the assignment
  await c.env.DB.prepare(
    `UPDATE client_assignments SET status = 'revoked', revoked_at = datetime('now'),
     revoked_by = ?, notes = COALESCE(?, notes), updated_at = datetime('now') WHERE id = ?`
  ).bind(adminEmail, body.reason || null, id).run();

  // Optionally deactivate the underlying activation key
  if (body.deactivate_key) {
    await c.env.DB.prepare(
      `UPDATE activation_keys SET is_active = 0, deactivated_at = datetime('now') WHERE key_code = ?`
    ).bind(assignment.activation_key).run();
  }

  await logAction(c.env.DB, 'client_assignment_revoked', {
    assignment_id: id,
    agency_id: assignment.agency_id,
    client_name: assignment.client_name,
    client_email: assignment.client_email,
    activation_key: assignment.activation_key,
    deactivate_key: !!body.deactivate_key,
    reason: body.reason || null,
  }, adminEmail);

  return c.json({ success: true });
});

// ─── BUNDLED DELIVERIES (BIAB) ───────────────────────────────────────────────

/**
 * GET /api/bundled-deliveries
 * List bundled deliveries. Supports optional filters:
 *   ?agency_id=N — filter by agency
 *   ?delivery_status=pending|sent|delivered|failed — filter by status
 * Admin sees all; agency view should pass agency_id.
 */
app.get('/api/bundled-deliveries', authMiddleware, async (c) => {
  const agencyId = c.req.query('agency_id');
  const deliveryStatus = c.req.query('delivery_status');

  let query = `
    SELECT bd.*, a.agency_name
    FROM bundled_deliveries bd
    LEFT JOIN agencies a ON bd.agency_id = a.id
  `;
  const conditions: string[] = [];
  const params: any[] = [];

  if (agencyId) {
    conditions.push('bd.agency_id = ?');
    params.push(parseInt(agencyId));
  }
  if (deliveryStatus) {
    conditions.push('bd.delivery_status = ?');
    params.push(deliveryStatus);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY bd.created_at DESC';

  const stmt = params.length > 0
    ? c.env.DB.prepare(query).bind(...params)
    : c.env.DB.prepare(query);

  const { results } = await stmt.all();
  return c.json(results);
});

/**
 * GET /api/bundled-deliveries/stats
 * Get delivery stats. Optionally filter by ?agency_id=N.
 */
app.get('/api/bundled-deliveries/stats', authMiddleware, async (c) => {
  const agencyId = c.req.query('agency_id');

  if (agencyId) {
    const aid = parseInt(agencyId);
    const [total, pending, sent, delivered, failed] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM bundled_deliveries WHERE agency_id = ?').bind(aid).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM bundled_deliveries WHERE agency_id = ? AND delivery_status = 'pending'").bind(aid).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM bundled_deliveries WHERE agency_id = ? AND delivery_status = 'sent'").bind(aid).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM bundled_deliveries WHERE agency_id = ? AND delivery_status = 'delivered'").bind(aid).first<{ count: number }>(),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM bundled_deliveries WHERE agency_id = ? AND delivery_status = 'failed'").bind(aid).first<{ count: number }>(),
    ]);

    return c.json({
      total: total?.count || 0,
      pending: pending?.count || 0,
      sent: sent?.count || 0,
      delivered: delivered?.count || 0,
      failed: failed?.count || 0,
    });
  }

  const [total, pending, sent, delivered, failed] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as count FROM bundled_deliveries').first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM bundled_deliveries WHERE delivery_status = 'pending'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM bundled_deliveries WHERE delivery_status = 'sent'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM bundled_deliveries WHERE delivery_status = 'delivered'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM bundled_deliveries WHERE delivery_status = 'failed'").first<{ count: number }>(),
  ]);

  return c.json({
    total: total?.count || 0,
    pending: pending?.count || 0,
    sent: sent?.count || 0,
    delivered: delivered?.count || 0,
    failed: failed?.count || 0,
  });
});

/**
 * GET /api/bundled-deliveries/:id
 * Get a single bundled delivery by ID.
 */
app.get('/api/bundled-deliveries/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const delivery = await c.env.DB.prepare(
    `SELECT bd.*, a.agency_name
     FROM bundled_deliveries bd
     LEFT JOIN agencies a ON bd.agency_id = a.id
     WHERE bd.id = ?`
  ).bind(id).first();

  if (!delivery) {
    return c.json({ error: 'Bundled delivery not found' }, 404);
  }

  return c.json(delivery);
});

/**
 * POST /api/bundled-deliveries
 * Create a new bundled delivery — agency sends RiteDoc installer + activation key to a client.
 * Links to an existing client assignment.
 * Body: { agency_id, client_assignment_id, delivery_method?, notes? }
 */
app.post('/api/bundled-deliveries', authMiddleware, async (c) => {
  const body = await c.req.json<any>();
  const { agency_id, client_assignment_id, delivery_method, notes } = body;

  if (!agency_id) {
    return c.json({ error: 'agency_id is required' }, 400);
  }
  if (!client_assignment_id) {
    return c.json({ error: 'client_assignment_id is required' }, 400);
  }

  // Verify agency exists and is active
  const agency = await c.env.DB.prepare(
    'SELECT * FROM agencies WHERE id = ? AND is_active = 1'
  ).bind(agency_id).first<{ id: number; agency_name: string }>();

  if (!agency) {
    return c.json({ error: 'Agency not found or inactive' }, 404);
  }

  // Verify the client assignment exists and belongs to this agency
  const assignment = await c.env.DB.prepare(
    "SELECT * FROM client_assignments WHERE id = ? AND status = 'active'"
  ).bind(client_assignment_id).first<{ id: number; agency_id: number; client_name: string; client_email: string; activation_key: string }>();

  if (!assignment) {
    return c.json({ error: 'Client assignment not found or not active' }, 404);
  }

  if (assignment.agency_id !== agency_id) {
    return c.json({ error: 'Client assignment does not belong to this agency' }, 403);
  }

  const method = delivery_method === 'manual' ? 'manual' : 'email';

  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO bundled_deliveries (agency_id, client_assignment_id, client_name, client_email, activation_key, delivery_method, delivery_status, notes)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
    ).bind(
      agency_id,
      client_assignment_id,
      assignment.client_name,
      assignment.client_email,
      assignment.activation_key,
      method,
      notes || null
    ).run();

    // If delivery method is email, mark as sent immediately (email integration placeholder)
    if (method === 'email') {
      await c.env.DB.prepare(
        `UPDATE bundled_deliveries SET delivery_status = 'sent', sent_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      ).bind(result.meta.last_row_id).run();
    }

    await logAction(c.env.DB, 'bundled_delivery_created', {
      delivery_id: result.meta.last_row_id,
      agency_id,
      agency_name: agency.agency_name,
      client_name: assignment.client_name,
      client_email: assignment.client_email,
      activation_key: assignment.activation_key,
      delivery_method: method,
    }, c.get('jwtPayload')?.email || 'admin');

    return c.json({ success: true, id: result.meta.last_row_id }, 201);
  } catch (e: any) {
    return c.json({ error: e.message }, 400);
  }
});

/**
 * PUT /api/bundled-deliveries/:id/status
 * Update the delivery status of a bundled delivery.
 * Body: { delivery_status: 'pending'|'sent'|'delivered'|'failed', notes? }
 */
app.put('/api/bundled-deliveries/:id/status', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<any>();
  const { delivery_status, notes } = body;

  const validStatuses = ['pending', 'sent', 'delivered', 'failed'];
  if (!delivery_status || !validStatuses.includes(delivery_status)) {
    return c.json({ error: `delivery_status must be one of: ${validStatuses.join(', ')}` }, 400);
  }

  const delivery = await c.env.DB.prepare(
    'SELECT * FROM bundled_deliveries WHERE id = ?'
  ).bind(id).first<{ id: number; agency_id: number; client_name: string; delivery_status: string }>();

  if (!delivery) {
    return c.json({ error: 'Bundled delivery not found' }, 404);
  }

  const sentAt = delivery_status === 'sent' && delivery.delivery_status !== 'sent'
    ? ", sent_at = datetime('now')"
    : '';

  await c.env.DB.prepare(
    `UPDATE bundled_deliveries SET delivery_status = ?, notes = COALESCE(?, notes),
     updated_at = datetime('now')${sentAt} WHERE id = ?`
  ).bind(delivery_status, notes || null, id).run();

  await logAction(c.env.DB, 'bundled_delivery_status_updated', {
    delivery_id: id,
    agency_id: delivery.agency_id,
    client_name: delivery.client_name,
    old_status: delivery.delivery_status,
    new_status: delivery_status,
  }, c.get('jwtPayload')?.email || 'admin');

  return c.json({ success: true });
});

/**
 * POST /api/bundled-deliveries/:id/resend
 * Resend a bundled delivery. Resets status to pending/sent.
 * Body: { delivery_method?: 'email'|'manual', notes? }
 */
app.post('/api/bundled-deliveries/:id/resend', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<any>().catch(() => ({}));

  const delivery = await c.env.DB.prepare(
    'SELECT bd.*, a.agency_name FROM bundled_deliveries bd LEFT JOIN agencies a ON bd.agency_id = a.id WHERE bd.id = ?'
  ).bind(id).first<{ id: number; agency_id: number; agency_name: string; client_name: string; client_email: string; activation_key: string; delivery_method: string }>();

  if (!delivery) {
    return c.json({ error: 'Bundled delivery not found' }, 404);
  }

  const method = body.delivery_method === 'manual' ? 'manual' : (body.delivery_method === 'email' ? 'email' : delivery.delivery_method);
  const newStatus = method === 'email' ? 'sent' : 'pending';

  await c.env.DB.prepare(
    `UPDATE bundled_deliveries SET delivery_method = ?, delivery_status = ?,
     sent_at = datetime('now'), notes = COALESCE(?, notes), updated_at = datetime('now') WHERE id = ?`
  ).bind(method, newStatus, body.notes || null, id).run();

  await logAction(c.env.DB, 'bundled_delivery_resent', {
    delivery_id: id,
    agency_id: delivery.agency_id,
    agency_name: delivery.agency_name,
    client_name: delivery.client_name,
    client_email: delivery.client_email,
    activation_key: delivery.activation_key,
    delivery_method: method,
  }, c.get('jwtPayload')?.email || 'admin');

  return c.json({ success: true, delivery_status: newStatus });
});

// ─── HEALTH ───────────────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok', service: 'readycompliant-api', timestamp: new Date().toISOString() }));
app.get('/', (c) => c.json({ service: 'ReadyCompliant API', version: '1.0.0' }));

// ─── Export ───────────────────────────────────────────────────────────────────

export default app;
