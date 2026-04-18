-- Migration: Subscriptions Management
-- Run with: wrangler d1 execute readycompliant-db --file=migrations/006_subscriptions.sql
--
-- Tracks client subscriptions for BIAB agencies. Enables agencies and admins
-- to view active clients, subscription status, plan types, billing cycles,
-- and expiry dates. Includes optional Stripe integration fields for future
-- automated billing.

-- ─── Subscriptions table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agency_id INTEGER NOT NULL REFERENCES agencies(id),
  client_assignment_id INTEGER REFERENCES client_assignments(id),  -- optional link to client assignment
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'standard',                       -- founders, standard, enterprise
  amount REAL NOT NULL DEFAULT 0,                                   -- monthly cost
  currency TEXT NOT NULL DEFAULT 'AUD',
  status TEXT NOT NULL DEFAULT 'active',                            -- active, paused, cancelled, expired
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',                    -- monthly, annual
  start_date DATETIME NOT NULL DEFAULT (datetime('now')),
  next_billing_date DATETIME,
  expiry_date DATETIME,
  stripe_subscription_id TEXT,                                      -- optional, for future Stripe integration
  auto_renew INTEGER NOT NULL DEFAULT 1,                            -- boolean: 1 = true, 0 = false
  notes TEXT,
  created_at DATETIME DEFAULT (datetime('now')),
  updated_at DATETIME DEFAULT (datetime('now'))
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_agency ON subscriptions(agency_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_client_email ON subscriptions(client_email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_client_assignment ON subscriptions(client_assignment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry_date ON subscriptions(expiry_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created ON subscriptions(created_at);
