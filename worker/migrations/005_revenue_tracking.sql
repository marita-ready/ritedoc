-- Migration: Revenue Tracking System
-- Run with: wrangler d1 execute readycompliant-db --file=migrations/005_revenue_tracking.sql
--
-- Enables BIAB agencies and admins to track revenue generated from reselling
-- RiteDoc licences. Supports subscription, one-time, and refund transaction types
-- with optional Stripe integration fields for future payment automation.

-- ─── Revenue Transactions table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  client_assignment_id INTEGER REFERENCES client_assignments(id),  -- optional link
  transaction_type TEXT NOT NULL DEFAULT 'subscription',           -- subscription, one-time, refund
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'AUD',
  description TEXT,
  stripe_payment_id TEXT,                                          -- optional, for future Stripe integration
  status TEXT NOT NULL DEFAULT 'completed',                        -- pending, completed, refunded
  transaction_date DATETIME NOT NULL DEFAULT (datetime('now')),
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- ─── Agency Revenue Summary table ───────────────────────────────────────────
-- Maintained / refreshed by the Worker on each transaction write.
-- Provides fast reads for dashboard cards without aggregating on every request.
CREATE TABLE IF NOT EXISTS agency_revenue_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL UNIQUE REFERENCES agencies(id),
  total_revenue REAL NOT NULL DEFAULT 0,
  total_refunds REAL NOT NULL DEFAULT 0,
  net_revenue REAL NOT NULL DEFAULT 0,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  last_updated DATETIME DEFAULT (datetime('now'))
);

-- ─── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_agency ON revenue_transactions(agency_id);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_type ON revenue_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_status ON revenue_transactions(status);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_date ON revenue_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_created ON revenue_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_revenue_transactions_stripe ON revenue_transactions(stripe_payment_id);
CREATE INDEX IF NOT EXISTS idx_agency_revenue_summary_agency ON agency_revenue_summary(agency_id);
