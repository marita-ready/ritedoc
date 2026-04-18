-- Migration: Add Mobile Access Codes system for BIAB agencies
-- Run with: wrangler d1 execute readycompliant-db --file=migrations/001_mobile_access_codes.sql

-- ─── Mobile Access Codes table ──────────────────────────────────────────────
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

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mobile_codes_code ON mobile_access_codes(code);
CREATE INDEX IF NOT EXISTS idx_mobile_codes_agency ON mobile_access_codes(agency_id);
CREATE INDEX IF NOT EXISTS idx_mobile_codes_status ON mobile_access_codes(status);

-- ─── Add mobile seat columns to agencies table ─────────────────────────────
ALTER TABLE agencies ADD COLUMN mobile_seats_allocated INTEGER DEFAULT 0;
ALTER TABLE agencies ADD COLUMN mobile_seats_used INTEGER DEFAULT 0;
