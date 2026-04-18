-- ─── Migration 007: Support Tickets (BIAB) ─────────────────────────────────
-- Replaces the legacy client-centric support_tickets table with an
-- agency-oriented ticket system including threaded replies.
--
-- Run with: wrangler d1 execute readycompliant-db --file=worker/migrations/007_support_tickets.sql

-- 1. Drop the legacy support_tickets table (client-centric, no agency support)
DROP TABLE IF EXISTS support_tickets;

-- 2. Create the new agency-oriented support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  submitted_by TEXT NOT NULL,                          -- name of the person who submitted
  submitted_by_email TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',              -- activation_failed, licence_expired, billing_query, app_crash, feature_request, other
  priority TEXT NOT NULL DEFAULT 'medium',             -- low, medium, high, urgent
  subject TEXT NOT NULL DEFAULT 'Support Request',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',                 -- open, in_progress, waiting_on_customer, resolved, closed
  assigned_to TEXT,                                    -- admin name (optional)
  resolution_notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now')),
  resolved_at DATETIME,
  closed_at DATETIME
);

-- 3. Create the ticket_replies table for threaded conversations
CREATE TABLE IF NOT EXISTS ticket_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES support_tickets(id),
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'agency',           -- agency, admin
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT (datetime('now'))
);

-- 4. Indexes for support_tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_agency ON support_tickets(agency_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at);

-- 5. Indexes for ticket_replies
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket ON ticket_replies(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_created ON ticket_replies(created_at);
