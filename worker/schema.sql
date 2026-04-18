-- ReadyCompliant D1 Database Schema
-- Run with: wrangler d1 execute readycompliant-db --file=schema.sql
-- Or via Cloudflare Dashboard > D1 > readycompliant-db > Console

-- ─── Admin Users ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- ─── Clients ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_name TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  abn TEXT,
  subscription_tier TEXT DEFAULT 'standard',
  status TEXT DEFAULT 'active',
  stripe_customer_id TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- ─── Activation Keys ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activation_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_code TEXT NOT NULL UNIQUE,
  client_id INTEGER REFERENCES clients(id),
  agency_id INTEGER REFERENCES agencies(id),
  subscription_type TEXT DEFAULT 'standard',
  is_active INTEGER DEFAULT 1,
  hardware_fingerprint TEXT,
  activated_at DATETIME,
  deactivated_at DATETIME,
  seat_request_id INTEGER REFERENCES seat_requests(id),
  created_at DATETIME DEFAULT (datetime('now'))
);

-- ─── Agencies (BIAB) ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  abn TEXT,
  seats_purchased INTEGER DEFAULT 5,
  mobile_seats_allocated INTEGER DEFAULT 0,
  mobile_seats_used INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- ─── Support Tickets ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER REFERENCES clients(id),
  subject TEXT DEFAULT 'Support Request',
  category TEXT DEFAULT 'general',
  description TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'open',
  resolution TEXT,
  notes TEXT,
  resolved_at DATETIME,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- ─── Cartridge Versions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cartridge_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  release_notes TEXT,
  files TEXT,      -- JSON array: [{name, hash, size}]
  checksums TEXT,  -- JSON object: {filename: sha256_hex}
  signature TEXT,  -- Ed25519 hex signature of manifest
  r2_path TEXT,    -- e.g. "cartridges/2.1.0/"
  uploaded_by TEXT,
  uploaded_at DATETIME DEFAULT (datetime('now'))
);

-- ─── Automation Log ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  details_json TEXT,
  performed_by TEXT,
  performed_at DATETIME DEFAULT (datetime('now'))
);

-- ─── Mobile Access Codes (BIAB) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mobile_access_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  status TEXT NOT NULL DEFAULT 'active',  -- active, redeemed, expired, revoked
  created_at DATETIME DEFAULT (datetime('now')),
  redeemed_at DATETIME,
  redeemed_by TEXT,                       -- device identifier or user name
  activation_token TEXT,                  -- returned on successful redemption
  expires_at DATETIME                     -- optional expiry for unused codes
);

-- ─── Wholesale Seat Requests ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seat_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  agency_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  seats_requested INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
  admin_notes TEXT,                        -- notes from admin on approval/rejection
  reviewed_by TEXT,                        -- admin email who reviewed
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- ─── Client Assignments (BIAB) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_organisation TEXT,
  activation_key TEXT NOT NULL,
  assigned_at DATETIME DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'active',  -- active, revoked, expired
  notes TEXT,
  revoked_at DATETIME,
  revoked_by TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_keys_code ON activation_keys(key_code);
CREATE INDEX IF NOT EXISTS idx_keys_client ON activation_keys(client_id);
CREATE INDEX IF NOT EXISTS idx_keys_active ON activation_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_client ON support_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_log_action ON automation_log(action);
CREATE INDEX IF NOT EXISTS idx_log_time ON automation_log(performed_at);
CREATE INDEX IF NOT EXISTS idx_mobile_codes_code ON mobile_access_codes(code);
CREATE INDEX IF NOT EXISTS idx_mobile_codes_agency ON mobile_access_codes(agency_id);
CREATE INDEX IF NOT EXISTS idx_mobile_codes_status ON mobile_access_codes(status);
CREATE INDEX IF NOT EXISTS idx_seat_requests_agency ON seat_requests(agency_id);
CREATE INDEX IF NOT EXISTS idx_seat_requests_status ON seat_requests(status);
CREATE INDEX IF NOT EXISTS idx_seat_requests_created ON seat_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_client_assignments_agency ON client_assignments(agency_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_status ON client_assignments(status);
CREATE INDEX IF NOT EXISTS idx_client_assignments_email ON client_assignments(client_email);
CREATE INDEX IF NOT EXISTS idx_client_assignments_key ON client_assignments(activation_key);
CREATE INDEX IF NOT EXISTS idx_client_assignments_created ON client_assignments(created_at);

-- ─── Default Admin User ───────────────────────────────────────────────────────
-- Password: ReadyCompliant2026! (SHA-256 hashed)
-- CHANGE THIS PASSWORD IMMEDIATELY after first login.
-- To generate a new hash: echo -n "YourNewPassword" | sha256sum
INSERT OR IGNORE INTO admin_users (email, password_hash, role)
VALUES (
  'admin@readycompliant.com',
  '1d7834ef8478daac69b6f38993555f5410220658a1f5300b0805f79d60d68c25',
  'superadmin'
);
