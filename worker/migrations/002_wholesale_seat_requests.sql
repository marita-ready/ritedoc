-- Migration: Wholesale Seat Request System
-- Run with: wrangler d1 execute readycompliant-db --file=migrations/002_wholesale_seat_requests.sql
--
-- Allows BIAB agencies to request additional RiteDoc desktop licence seats.
-- Requests enter a queue that ReadyCompliant admin can approve or reject.
-- On approval, activation keys are generated and linked to the request.

-- ─── Seat Requests table ────────────────────────────────────────────────────
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

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_seat_requests_agency ON seat_requests(agency_id);
CREATE INDEX IF NOT EXISTS idx_seat_requests_status ON seat_requests(status);
CREATE INDEX IF NOT EXISTS idx_seat_requests_created ON seat_requests(created_at);

-- ─── Link activation keys to seat requests ──────────────────────────────────
-- Add seat_request_id column to activation_keys so we can track which keys
-- were generated as part of a wholesale seat request approval.
ALTER TABLE activation_keys ADD COLUMN seat_request_id INTEGER REFERENCES seat_requests(id);
