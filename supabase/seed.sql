-- ============================================================================
-- LOCAL / DEV ONLY seed data.
-- This file is intentionally NOT used by the running application.
-- Run manually against a local Supabase project to play with the app.
-- ============================================================================

insert into schools (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Demo School')
on conflict (id) do nothing;

-- NOTE: To create staff profiles you must first create the auth.users via the
-- Supabase dashboard or admin API, then insert matching rows into profiles
-- using the same id. Example (replace ids with real auth.users.ids):
--
-- insert into profiles (id, school_id, name, email, phone, role, status) values
--   ('<admin-auth-uid>',      '00000000-0000-0000-0000-000000000001', 'Demo Admin',      'admin@example.com',      '1234567890', 'admin',      'active'),
--   ('<specialist-auth-uid>', '00000000-0000-0000-0000-000000000001', 'Demo Specialist', 'specialist@example.com', '1234567891', 'specialist', 'active'),
--   ('<teacher-auth-uid>',    '00000000-0000-0000-0000-000000000001', 'Demo Teacher',    'teacher@example.com',    '1234567892', 'teacher',    'active');
