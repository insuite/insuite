-- =====================================================
-- Admin role.
--
-- Adds `profiles.is_admin` and the RLS that turns it into something the
-- mobile client can actually rely on (rather than a UI-only flag).
--
-- After applying:
--   1. Run once in the Dashboard SQL editor:
--        update profiles set is_admin = true where id = '<your-user-id>';
--      You'll find your id under Authentication → Users.
--   2. The /admin tab unlocks in the app for that account.
--
-- Idempotent — safe to re-run.
-- =====================================================

-- 1. The flag itself.
alter table profiles
  add column if not exists is_admin boolean not null default false;

-- 2. Lock the flag down. The existing "profiles update own" policy lets a
--    user write their own row, which would otherwise let anyone self-promote.
--    Two layers of defense:
--
--   (a) Column-level REVOKE. Documents intent. *Doesn't actually enforce
--       on its own* — Supabase grants `authenticated` a table-wide UPDATE,
--       and table-wide UPDATE covers all columns, so a column-level revoke
--       is a no-op while the table-level grant exists. Kept here as a
--       tripwire in case grants are ever tightened.
--
--   (b) BEFORE UPDATE trigger — the real wall. Rejects any UPDATE that
--       changes is_admin when current_user is 'authenticated' or 'anon'.
--       service_role (edge functions) and Dashboard (postgres) sessions
--       pass through, so legitimate admin assignment via
--       `update profiles set is_admin = true where id = '...'` from the
--       SQL editor still works.
revoke update (is_admin) on profiles from anon, authenticated;

create or replace function public.block_is_admin_self_assignment() returns trigger
language plpgsql
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and current_user in ('authenticated', 'anon') then
    raise exception 'is_admin can only be changed by service_role or dashboard'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_block_is_admin_self_assignment on profiles;
create trigger profiles_block_is_admin_self_assignment
  before update of is_admin on profiles
  for each row
  execute function public.block_is_admin_self_assignment();

-- 3. hotels: read stays open to all authenticated users (existing policy).
--    Write is now admin-only — previously there was no write policy at all,
--    so inserts had to go through the Dashboard. Admins can now do it from
--    the app.
drop policy if exists "hotels admin insert" on hotels;
create policy "hotels admin insert"
  on hotels for insert to authenticated
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "hotels admin update" on hotels;
create policy "hotels admin update"
  on hotels for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "hotels admin delete" on hotels;
create policy "hotels admin delete"
  on hotels for delete to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- 4. hotel_requests: existing policies let the submitter insert and read
--    their own. Admins additionally need to see the whole queue and flip
--    status to 'approved' / 'rejected'.
drop policy if exists "hotel_requests admin read" on hotel_requests;
create policy "hotel_requests admin read"
  on hotel_requests for select to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "hotel_requests admin update" on hotel_requests;
create policy "hotel_requests admin update"
  on hotel_requests for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
