-- Generic "touch updated_at" trigger, applied to every table below instead
-- of trusting application code to remember it on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Sets updated_at = now() on any UPDATE. Attached as a BEFORE UPDATE trigger on every table with audit fields.';
