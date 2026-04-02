-- ============================================================
-- RiteDoc / ReadyCompliant — Supabase Schema
-- Migration 001: Initial schema for activation keys, clients,
-- support tickets, cartridge versions, agencies, and audit log.
-- ============================================================
-- Run this in the Supabase SQL Editor or via supabase db push.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. AGENCIES (BIAB — Business in a Box)
-- ============================================================
-- Must be created first because activation_keys references it.
-- Each agency purchases a block of seats.
-- Keys are linked to agencies via agency_id.
-- ============================================================
CREATE TABLE IF NOT EXISTS agencies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_name     TEXT NOT NULL,
    abn             TEXT,
    contact_name    TEXT,
    contact_email   TEXT,
    contact_phone   TEXT,
    seats_purchased INTEGER NOT NULL DEFAULT 5,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. ACTIVATION KEYS
-- ============================================================
-- Stores licence keys for RiteDoc desktop app.
-- Each key is single-use, locked to one hardware fingerprint.
-- ============================================================
CREATE TABLE IF NOT EXISTS activation_keys (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_code             TEXT NOT NULL UNIQUE,
    subscription_type    TEXT NOT NULL DEFAULT 'standard'
                         CHECK (subscription_type IN ('founders', 'standard', 'biab')),
    agency_id            UUID REFERENCES agencies(id) ON DELETE SET NULL,
    hardware_fingerprint TEXT,
    activated_at         TIMESTAMPTZ,
    deactivated_at       TIMESTAMPTZ,
    is_active            BOOLEAN NOT NULL DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast key lookup during activation
CREATE INDEX IF NOT EXISTS idx_activation_keys_key_code
    ON activation_keys (key_code);

-- Index for agency seat counting
CREATE INDEX IF NOT EXISTS idx_activation_keys_agency
    ON activation_keys (agency_id)
    WHERE agency_id IS NOT NULL;

-- ============================================================
-- 3. CLIENTS
-- ============================================================
-- Individual or company subscribers.
-- Tracks subscription lifecycle and Stripe integration.
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                TEXT NOT NULL,
    email               TEXT,
    phone               TEXT,
    address             TEXT,
    company_name        TEXT,
    abn                 TEXT,
    subscription_type   TEXT DEFAULT 'standard'
                        CHECK (subscription_type IN ('founders', 'standard', 'biab')),
    subscription_status TEXT DEFAULT 'active'
                        CHECK (subscription_status IN ('active', 'cancelled', 'suspended', 'trial')),
    start_date          TIMESTAMPTZ,
    cancellation_date   TIMESTAMPTZ,
    stripe_customer_id  TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_clients_email
    ON clients (email)
    WHERE email IS NOT NULL;

-- ============================================================
-- 4. SUPPORT TICKETS
-- ============================================================
-- Internal support ticket tracking.
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
    category    TEXT NOT NULL DEFAULT 'other'
                CHECK (category IN ('activation', 'billing', 'technical', 'feature_request', 'other')),
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'resolved')),
    resolution  TEXT,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- Index for open ticket queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_status
    ON support_tickets (status)
    WHERE status != 'resolved';

-- ============================================================
-- 5. CARTRIDGE VERSIONS
-- ============================================================
-- Tracks compliance cartridge releases.
-- Files are stored in Supabase Storage bucket "cartridges".
-- ============================================================
CREATE TABLE IF NOT EXISTS cartridge_versions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version     TEXT NOT NULL UNIQUE,
    filename    TEXT,
    notes       TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. KEY AUDIT LOG
-- ============================================================
-- Immutable audit trail for all key lifecycle events.
-- ============================================================
CREATE TABLE IF NOT EXISTS key_audit_log (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_id       UUID REFERENCES activation_keys(id) ON DELETE SET NULL,
    action       TEXT NOT NULL,
    reason       TEXT,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for audit queries by key
CREATE INDEX IF NOT EXISTS idx_key_audit_log_key_id
    ON key_audit_log (key_id);

-- ============================================================
-- 7. STORAGE BUCKET
-- ============================================================
-- Create the "cartridges" storage bucket for cartridge files.
-- Run this via Supabase Dashboard > Storage > New Bucket,
-- or uncomment the SQL below (requires storage schema access):
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('cartridges', 'cartridges', true)
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================
-- Enable RLS on all tables. Policies below allow:
-- - Tauri app (anon key): read activation_keys, update on activation,
--   read cartridge_versions, insert audit log entries
-- - Admin dashboard (service role key): full CRUD on all tables
--
-- In production, replace the broad "USING (true)" policies with
-- proper role-based checks using Supabase Auth.
-- ============================================================

ALTER TABLE activation_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartridge_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_audit_log ENABLE ROW LEVEL SECURITY;

-- Tauri app policies (anon key)
CREATE POLICY "anon_select_activation_keys" ON activation_keys
    FOR SELECT USING (true);

CREATE POLICY "anon_update_activation_keys" ON activation_keys
    FOR UPDATE USING (true);

CREATE POLICY "anon_select_cartridge_versions" ON cartridge_versions
    FOR SELECT USING (true);

CREATE POLICY "anon_insert_key_audit_log" ON key_audit_log
    FOR INSERT WITH CHECK (true);

-- Admin dashboard policies (service role or authenticated admin)
-- Using broad policies for early development; tighten in production
CREATE POLICY "admin_all_clients" ON clients
    FOR ALL USING (true);

CREATE POLICY "admin_all_agencies" ON agencies
    FOR ALL USING (true);

CREATE POLICY "admin_all_support_tickets" ON support_tickets
    FOR ALL USING (true);

CREATE POLICY "admin_all_cartridge_versions" ON cartridge_versions
    FOR ALL USING (true);

CREATE POLICY "admin_all_activation_keys" ON activation_keys
    FOR ALL USING (true);

CREATE POLICY "admin_all_key_audit_log" ON key_audit_log
    FOR ALL USING (true);

-- ============================================================
-- 9. SEED DATA
-- ============================================================
-- Insert the initial v2.0.0 cartridge version record
-- ============================================================
INSERT INTO cartridge_versions (version, filename, notes)
VALUES (
    '2.0.0',
    'red_flags_v2.json, rubric_v2.json, policies.json, system_prompts.json',
    'Initial cartridge release: 12 categories, 690+ keywords, 5-pillar rubric, full Practice Standards'
)
ON CONFLICT (version) DO NOTHING;
