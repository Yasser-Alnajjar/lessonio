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