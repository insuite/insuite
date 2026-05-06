-- =====================================================
-- Passes — INSERT policy.
-- For v1 the client inserts a pass row directly after the IAP succeeds.
-- (Later we should move insertion server-side via an Edge Function that
-- verifies the receipt with Apple — see passes_validate.sql, future.)
--
-- Add the new pass `type` values to the existing CHECK constraint as well so
-- pass_7 / pass_14 / pass_30 (consumable Apple IAPs) can be stored alongside
-- the legacy `trip_14` / `free_7` / `referral_7` values.
-- =====================================================

-- Drop the old CHECK and recreate with the broader allow-list.
alter table passes drop constraint if exists passes_type_check;
alter table passes
  add constraint passes_type_check
  check (
    type in (
      'trip_14',
      'free_7',
      'referral_7',
      'pass_7',
      'pass_14',
      'pass_30'
    )
  );

drop policy if exists "passes insert own" on passes;
create policy "passes insert own"
  on passes for insert to authenticated with check (
    auth.uid() = user_id
  );

-- Index for the very common "find my active pass" query.
create index if not exists passes_user_active_idx
  on passes (user_id, expires_at desc)
  where expires_at > now();
