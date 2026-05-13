-- =====================================================
-- RLS verification for admin_reports.sql + the reporter-side
-- invariants from blocks_and_reports.sql.
--
-- Paste into Supabase Dashboard → SQL Editor and Run. The final SELECT
-- returns a PASS / FAIL row per test in the Results panel.
--
-- What's checked:
--   T1 SELECT reports         own-only filter (non-admin sees nothing)
--   T2 UPDATE reports         blocked for non-admin
--   T3 INSERT impersonation   blocked (reporter_id must equal auth.uid)
--   T4 DELETE reports         blocked (no delete policy exists at all)
--
-- Uses a synthetic non-admin uid (random uuid with no profile row).
-- That uid is "not admin" by definition, can never satisfy any
-- ownership USING clause, and can never satisfy the WITH CHECK on
-- the reporter-self insert policy.
--
-- Destructive ops are wrapped in sub-transactions with a v_bad flag —
-- a real RLS hole gets logged but doesn't actually mutate data.
--
-- Idempotent: cleans up the seeded test row on the way out.
-- =====================================================
drop table if exists _rls_reports_test_log;
create temp table _rls_reports_test_log (
  ord     int  not null,
  test    text,
  outcome text,
  detail  text
);
grant insert, select on _rls_reports_test_log to authenticated;

do $$
declare
  v_fake_uid uuid := gen_random_uuid();
  v_admin_id uuid;
  v_seed_report_id uuid;
  v_count int;
  v_bad boolean;
  v_ord int := 0;
begin
  select id into v_admin_id from profiles where is_admin = true limit 1;
  if v_admin_id is null then
    raise exception
      'No admin found. Bootstrap one first:  '
      'update profiles set is_admin = true where id = ''<your-user-id>'';';
  end if;

  -- Seed a report from the admin (self-targeted, just so it's a valid
  -- row to test visibility against). Cleaned up at the end.
  insert into reports (reporter_id, reported_user_id, reason, details)
  values (v_admin_id, v_admin_id, 'spam', '__RLS_VIS_TEST__')
  returning id into v_seed_report_id;

  ----------------------------------------------------------------
  -- Impersonate fake non-admin
  ----------------------------------------------------------------
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_fake_uid::text, 'role', 'authenticated')::text,
    true);

  -- T1: SELECT reports — fake uid owns nothing and isn't admin, so 0 rows.
  v_ord := v_ord + 1;
  select count(*) into v_count from reports;
  insert into _rls_reports_test_log values (
    v_ord, 'T1 SELECT reports',
    case when v_count = 0 then 'PASS' else 'FAIL' end,
    case when v_count = 0 then 'own-only — 0 rows visible'
         else format('too many visible — %s rows (admin queue exposed)', v_count) end);

  -- T2: UPDATE someone else's report — admin-only policy filters it out.
  v_ord := v_ord + 1;
  update reports set status = 'actioned' where id = v_seed_report_id;
  get diagnostics v_count = row_count;
  insert into _rls_reports_test_log values (
    v_ord, 'T2 UPDATE reports',
    case when v_count = 0 then 'PASS' else 'FAIL' end,
    case when v_count = 0 then 'blocked — 0 rows affected'
         else format('allowed — %s rows affected (status flip possible)', v_count) end);

  -- T3: INSERT report claiming to be someone else (reporter_id = admin's
  -- id, not the caller's fake uid). The WITH CHECK on
  -- "reports insert as self" requires auth.uid() = reporter_id.
  -- Sub-txn so an accidental success gets rolled back.
  v_ord := v_ord + 1;
  v_bad := false;
  begin
    insert into reports (reporter_id, reported_user_id, reason, details)
    values (v_admin_id, v_admin_id, 'spam', '__RLS_T3_IMPERSONATION__');
    v_bad := true;
    raise exception '__rollback_t3__';
  exception when others then
    null;
  end;
  insert into _rls_reports_test_log values (
    v_ord, 'T3 INSERT reports as someone else',
    case when v_bad then 'FAIL' else 'PASS' end,
    case when v_bad then 'allowed — impersonation possible (undone)'
         else 'blocked by WITH CHECK' end);

  -- T4: DELETE reports — no delete policy exists in either migration,
  -- so non-admin (and admin too, by design) cannot DELETE. Reports
  -- stay forever as audit trail.
  v_ord := v_ord + 1;
  v_bad := false;
  begin
    delete from reports where id = v_seed_report_id;
    get diagnostics v_count = row_count;
    if v_count > 0 then
      v_bad := true;
      raise exception '__rollback_t4__';
    end if;
  exception when others then
    null;
  end;
  insert into _rls_reports_test_log values (
    v_ord, 'T4 DELETE reports',
    case when v_bad then 'FAIL' else 'PASS' end,
    case when v_bad then format('allowed — %s rows would be deleted (undone)', v_count)
         else 'blocked — no delete policy' end);

  ----------------------------------------------------------------
  -- Cleanup
  ----------------------------------------------------------------
  reset role;
  perform set_config('request.jwt.claims', null, true);
  delete from reports where id = v_seed_report_id;
end $$;

select test, outcome, detail
from _rls_reports_test_log
order by ord;
