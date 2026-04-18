-- Migration: Bundled Delivery System
-- Run with: wrangler d1 execute readycompliant-db --file=migrations/004_bundled_deliveries.sql
--
-- Enables BIAB agencies to send bundled deliveries (RiteDoc installer + activation key)
-- to their assigned clients. Tracks delivery method, status, and supports resend.

-- ─── Bundled Deliveries table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bundled_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  client_assignment_id INTEGER NOT NULL REFERENCES client_assignments(id),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  activation_key TEXT NOT NULL,
  delivery_method TEXT NOT NULL DEFAULT 'email',   -- email, manual
  delivery_status TEXT NOT NULL DEFAULT 'pending',  -- pending, sent, delivered, failed
  sent_at DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- ─── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bundled_deliveries_agency ON bundled_deliveries(agency_id);
CREATE INDEX IF NOT EXISTS idx_bundled_deliveries_assignment ON bundled_deliveries(client_assignment_id);
CREATE INDEX IF NOT EXISTS idx_bundled_deliveries_status ON bundled_deliveries(delivery_status);
CREATE INDEX IF NOT EXISTS idx_bundled_deliveries_email ON bundled_deliveries(client_email);
CREATE INDEX IF NOT EXISTS idx_bundled_deliveries_created ON bundled_deliveries(created_at);
