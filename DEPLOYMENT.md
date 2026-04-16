# ReadyCompliant — Cloudflare Deployment Guide

This document covers the complete deployment of the ReadyCompliant backend (Cloudflare Worker) and admin dashboard (Cloudflare Pages) from the `cloudflare-dashboard` branch.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      ReadyCompliant Stack                        │
├─────────────────────────────────────────────────────────────────┤
│  dashboard.readycompliant.com  →  Cloudflare Pages              │
│  (static HTML/JS/CSS — no server-side code)                     │
│                                                                  │
│  api.readycompliant.com        →  Cloudflare Worker             │
│  (all API routes, auth, D1 queries, R2 storage)                 │
│                                                                  │
│  readycompliant-db             →  Cloudflare D1 (SQLite)        │
│  readycompliant-cartridges     →  Cloudflare R2 (object store)  │
└─────────────────────────────────────────────────────────────────┘
```

**Security model:** Cartridge packages are signed locally on Aroha (Marita's laptop) using an Ed25519 private key. The private key **never** touches any server. The Worker only holds the public key for upload verification.

---

## Prerequisites

- Node.js 18+ and pnpm installed on Aroha
- Wrangler CLI: `pnpm install -g wrangler`
- Cloudflare account with Workers and Pages enabled
- R2 enabled in Cloudflare Dashboard (free tier — requires credit card on file)

---

## Step 1: Authenticate Wrangler

```bash
wrangler login
```

This opens a browser window. Log in with the ReadyCompliant Cloudflare account.

---

## Step 2: Create the D1 Database

The D1 database was already created via the Cloudflare MCP:
- **Name:** `readycompliant-db`
- **ID:** `068192b1-a6d0-47c2-a832-ee4870cd1add`

Run the schema and seed data:

```bash
cd worker/

# Create all tables
wrangler d1 execute readycompliant-db --file=schema.sql

# Seed default admin user
wrangler d1 execute readycompliant-db --file=seed.sql
```

---

## Step 3: Create the R2 Bucket

> **First:** Enable R2 in Cloudflare Dashboard → R2 Object Storage → Enable R2

```bash
wrangler r2 bucket create readycompliant-cartridges
```

Then uncomment the R2 binding in `worker/wrangler.toml`:

```toml
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "readycompliant-cartridges"
```

---

## Step 4: Generate Ed25519 Signing Keys (on Aroha only)

```bash
cd tools/
pnpm install
node generate_keys.js
```

This creates:
- `ritedoc_signing_key.pem` — **PRIVATE KEY** (keep on Aroha only)
- `ritedoc_signing_key.pub` — **PUBLIC KEY** (safe to share)

**After generating:**
1. Back up `ritedoc_signing_key.pem` to an encrypted USB drive and password manager
2. Copy the public key hex from `ritedoc_signing_key.pub`
3. Update `worker/wrangler.toml` → `PUBLIC_KEY_HEX = "your_public_key_hex_here"`
4. Update `src-tauri/src/regulation_sync.rs` with the same public key hex

---

## Step 5: Set Worker Secrets

```bash
cd worker/

# Required: JWT signing secret (generate a random 64-char string)
wrangler secret put JWT_SECRET
# Enter: <random 64-char string, e.g. from: openssl rand -hex 32>

# Required: HMAC secret for RiteDoc app sync requests
wrangler secret put HMAC_SECRET
# Enter: <random 32-char string — must match what's compiled into RiteDoc app>

# Optional: Stripe webhook secret (from Stripe Dashboard → Webhooks)
wrangler secret put STRIPE_WEBHOOK_SECRET
```

---

## Step 6: Deploy the Worker

```bash
cd worker/
pnpm install
wrangler deploy
```

The Worker will be available at:
- `https://readycompliant-api.<your-subdomain>.workers.dev`

### Set up custom domain (api.readycompliant.com)

1. Go to Cloudflare Dashboard → Workers & Pages → readycompliant-api → Settings → Domains & Routes
2. Add custom domain: `api.readycompliant.com`
3. Ensure `readycompliant.com` is on Cloudflare DNS

---

## Step 7: Deploy the Dashboard to Cloudflare Pages

```bash
# From the repo root
wrangler pages deploy dashboard/ --project-name=readycompliant-dashboard
```

Or connect via GitHub:
1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
2. Select `marita-ready/ritedoc` repository
3. Branch: `cloudflare-dashboard`
4. Build settings:
   - Build command: *(leave empty — static files)*
   - Build output directory: `dashboard`
5. Deploy

### Set up custom domain (dashboard.readycompliant.com)

1. Go to the Pages project → Custom domains → Add custom domain
2. Add: `dashboard.readycompliant.com`

---

## Step 8: Update Dashboard API URL

After deploying the Worker, update the API URL in the dashboard:

Edit `dashboard/js/dashboard.js` line ~14:
```javascript
apiUrl: localStorage.getItem('rc_api_url') || 'https://api.readycompliant.com',
```

Or users can set it via browser console:
```javascript
localStorage.setItem('rc_api_url', 'https://api.readycompliant.com');
```

---

## Default Admin Credentials

| Field | Value |
|-------|-------|
| Email | `admin@readycompliant.com` |
| Password | `ReadyCompliant2026!` |
| Role | `superadmin` |

> **IMPORTANT:** Change this password immediately after first login.

---

## Deployed Resources Summary

| Resource | Name/ID |
|----------|---------|
| D1 Database | `readycompliant-db` (ID: `068192b1-a6d0-47c2-a832-ee4870cd1add`) |
| R2 Bucket | `readycompliant-cartridges` (create after enabling R2) |
| Worker | `readycompliant-api` |
| Pages | `readycompliant-dashboard` |
| Dashboard URL | `https://dashboard.readycompliant.com` |
| API URL | `https://api.readycompliant.com` |

---

## Regulation Sync Contract (RiteDoc App)

The `POST /api/sync/check` endpoint matches what `regulation_sync.rs` expects:

**Request:**
```json
{
  "license_key": "RD-XXXX-XXXX-XXXX",
  "hardware_fingerprint": "<sha256 of machine identifiers>",
  "current_version": "2.0.0"
}
```

**Headers:**
```
X-HMAC-Signature: <HMAC-SHA256 of request body using HMAC_SECRET>
X-Timestamp: <unix timestamp>
```

**Response:**
```json
{
  "has_update": true,
  "version": "2.1.0",
  "r2_path": "cartridges/2.1.0/",
  "signature": "<hex Ed25519 signature of manifest>",
  "files": [{"name": "red_flags_v2.json", "hash": "...", "size": 12345}],
  "checksums": {"red_flags_v2.json": "<sha256>"},
  "download_urls": {"red_flags_v2.json": "cartridges/2.1.0/red_flags_v2.json"}
}
```

The `signature` in the response is the Ed25519 signature created by Aroha at upload time. The RiteDoc app verifies this signature using the compiled-in public key before trusting any downloaded files.

---

## Uploading Cartridge Updates

1. On Aroha, prepare cartridge JSON files in a directory
2. Sign the package:
   ```bash
   cd tools/
   node sign_cartridge.js ~/my-cartridge/ ./ritedoc_signing_key.pem 2.1.0 "Updated red flags for NDIS 2026"
   ```
3. This creates `cartridge_2_1_0.rsp`
4. Log into `dashboard.readycompliant.com`
5. Go to **Cartridges** → Upload Package → select the `.rsp` file → Upload
6. The Worker verifies the signature, stores files in R2, and records metadata in D1
7. Optionally click **Notify Subscribers** to send email via Brevo

---

## Stripe Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://api.readycompliant.com/api/webhooks/stripe`
3. Events to listen for:
   - `payment_intent.succeeded` — auto-generates activation key
   - `customer.subscription.deleted` — deactivates keys for cancelled subscriber

---

## Environment Variables Reference

| Variable | Where set | Description |
|----------|-----------|-------------|
| `PUBLIC_KEY_HEX` | `wrangler.toml` [vars] | Ed25519 public key for cartridge signature verification |
| `JWT_SECRET` | `wrangler secret put` | Secret for signing admin JWT tokens |
| `HMAC_SECRET` | `wrangler secret put` | Shared secret for RiteDoc app sync requests |
| `STRIPE_WEBHOOK_SECRET` | `wrangler secret put` | Stripe webhook signature verification |

---

## Local Development

```bash
cd worker/
pnpm install
wrangler dev
```

The Worker runs at `http://localhost:8787`. Update the dashboard's API URL:
```javascript
localStorage.setItem('rc_api_url', 'http://localhost:8787');
```

Open `dashboard/index.html` directly in a browser (or use `npx serve dashboard/`).
