-- Migration: Client Assignment System
-- Run with: wrangler d1 execute readycompliant-db --file=migrations/003_client_assignments.sql
--
-- Allows BIAB agencies to assign RiteDoc desktop licence activation keys
-- to individual clients from the dashboard. Tracks assignment status,
-- client details, and supports revocation.

-- ─── Client Assignments table ──────────────────────────────────────────────
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

-- ─── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_client_assignments_agency ON client_assignments(agency_id);
CREATE INDEX IF NOT EXISTS idx_client_assignments_status ON client_assignments(status);
CREATE INDEX IF NOT EXISTS idx_client_assignments_email ON client_assignments(client_email);
CREATE INDEX IF NOT EXISTS idx_client_assignments_key ON client_assignments(activation_key);
CREATE INDEX IF NOT EXISTS idx_client_assignments_created ON client_assignments(created_at);
