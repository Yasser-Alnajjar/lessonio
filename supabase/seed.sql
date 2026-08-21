-- Local development grants
-- Applied automatically after `supabase db reset`.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
on all tables in schema public
to authenticated;

grant usage, select
on all sequences in schema public
to authenticated;

grant execute
on all functions in schema public
to authenticated;

-- Keep privileges for objects created during local development.
alter default privileges in schema public
grant select, insert, update, delete
on tables to authenticated;

alter default privileges in schema public
grant usage, select
on sequences to authenticated;

alter default privileges in schema public
grant execute
on functions to authenticated;

-- ---------------------------------------------------------------------------
-- Local dev accounts, recreated fresh on every `supabase db reset`.
-- handle_new_user() (20260807120002_profiles.sql / 20260822120000_profiles_role.sql)
-- reads full_name/role out of raw_user_meta_data and provisions
-- public.profiles automatically, so there's nothing to insert there directly.
--
--   student@lessonio.dev / password123
--   teacher@lessonio.dev / password123
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'student@lessonio.dev',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Sara Student","role":"student"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'teacher@lessonio.dev',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Tariq Teacher","role":"teacher"}',
    now(), now(), '', '', '', ''
  )
on conflict (id) do nothing;

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"student@lessonio.dev"}',
    'email',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"teacher@lessonio.dev"}',
    'email',
    now(), now(), now()
  )
on conflict (provider_id, provider) do nothing;