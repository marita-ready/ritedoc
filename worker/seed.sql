-- ReadyCompliant D1 Seed Data
-- Run AFTER schema.sql with: wrangler d1 execute readycompliant-db --file=seed.sql
--
-- Default admin credentials:
--   Email:    admin@readycompliant.com
--   Password: ReadyCompliant2026!
--
-- IMPORTANT: Change the password immediately after first login.
-- To generate a new hash: echo -n "YourNewPassword" | sha256sum

INSERT OR IGNORE INTO admin_users (email, password_hash, role)
VALUES (
  'admin@readycompliant.com',
  '1d7834ef8478daac69b6f38993555f5410220658a1f5300b0805f79d60d68c25',
  'superadmin'
);

-- Log the seed action
INSERT INTO automation_log (action, details_json, performed_by)
VALUES (
  'database_seeded',
  '{"note":"Default admin user created. Change password immediately."}',
  'setup_script'
);
