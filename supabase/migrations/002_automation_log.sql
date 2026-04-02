-- ============================================================
-- RiteDoc / ReadyCompliant — Supabase Schema
-- Migration 002: Add automation_log table for full audit trail
-- of all automated actions (API calls, webhooks, Manus actions).
-- ============================================================

-- ============================================================
-- 1. AUTOMATION LOG
-- ============================================================
-- Every automated action is logged here with a JSON payload
-- describing what was done, why, and by whom.
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_log (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action        TEXT NOT NULL,
    details_json  JSONB DEFAULT '{}'::jsonb,
    performed_by  TEXT NOT NULL DEFAULT 'manus',
    performed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for time-based queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_automation_log_performed_at
    ON automation_log (performed_at DESC);

-- Index for filtering by action type
CREATE INDEX IF NOT EXISTS idx_automation_log_action
    ON automation_log (action);

-- Index for filtering by performer
CREATE INDEX IF NOT EXISTS idx_automation_log_performed_by
    ON automation_log (performed_by);

-- ============================================================
-- 2. ROW-LEVEL SECURITY
-- ============================================================
ALTER TABLE automation_log ENABLE ROW LEVEL SECURITY;

-- Admin dashboard: full access
CREATE POLICY "admin_all_automation_log" ON automation_log
    FOR ALL USING (true);

-- API / webhooks: insert-only (services can log but not delete)
CREATE POLICY "service_insert_automation_log" ON automation_log
    FOR INSERT WITH CHECK (true);
