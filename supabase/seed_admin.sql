-- ============================================================================
-- Create a single full school admin user (auth.users + auth.identities +
-- profiles) for the seeded Demo School.
--
--   Email:    admin@demo.local
--   Password: 123456
--   Role:     admin (full school admin)
--
-- Idempotent — safe to re-run; it will refresh the password and profile.
-- ============================================================================

do $$
declare
  v_user_id   uuid := 'a0000000-0000-0000-0000-000000000001';
  v_school_id uuid := '00000000-0000-0000-0000-000000000001';
  v_email     text := 'admin@demo.local';
  v_password  text := '123456';
begin
  -- 1) auth.users (Supabase Auth)
  insert into auth.users (
    instance_id, id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    v_email, crypt(v_password, gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('name', 'School Admin', 'role', 'admin'),
    now(), now(),
    '', '', '', ''
  )
  on conflict (id) do update set
    email              = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    raw_app_meta_data  = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at         = now();

  -- 2) auth.identities (required so email/password sign-in works)
  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id::text, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  )
  on conflict (provider, provider_id) do update set
    identity_data = excluded.identity_data,
    updated_at    = now();

  -- 3) profiles (application-level staff row)
  insert into profiles (id, school_id, name, email, phone, role, status)
  values (v_user_id, v_school_id, 'School Admin', v_email, '1234567890', 'admin', 'active')
  on conflict (id) do update set
    school_id  = excluded.school_id,
    name       = excluded.name,
    email      = excluded.email,
    phone      = excluded.phone,
    role       = excluded.role,
    status     = excluded.status,
    updated_at = now();
end $$;
