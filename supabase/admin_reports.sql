-- =====================================================
-- Admin RLS for the `reports` table.
--
-- Pair to admin_role.sql — the same is_admin gate, applied here to the
-- moderation queue created by supabase/blocks_and_reports.sql.
--
-- The existing reporter-side policies (insert as self, read own) stay
-- in place; this file only adds the admin's read-all / update-status
-- access. Reports are kept around forever for audit trail — no admin
-- DELETE policy by design.
--
-- After applying, the /admin/reports tab unlocks for any profile with
-- is_admin = true. Bootstrap is the same one-time
--   update profiles set is_admin = true where id = '<your-id>'
-- from admin_role.sql; if you already did it, nothing else is needed.
--
-- Idempotent — safe to re-run.
-- =====================================================

drop policy if exists "reports admin read" on reports;
create policy "reports admin read"
  on reports for select to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "reports admin update" on reports;
create policy "reports admin update"
  on reports for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
