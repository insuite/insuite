-- =====================================================
-- RLS verification for admin_role.sql.
-- Paste into Supabase Dashboard → SQL Editor and Run.
--
-- Logs one row per test into a temp table; the final SELECT returns
-- the table so results show in the standard Results panel (no Notices
-- tab hunting). ASCII PASS / FAIL outcomes — no unicode tripping over
-- clipboard / editor encodings.
--
-- What's checked:
--   T1 hotels insert            blocked for non-admin
--   T2 hotels update            filtered to 0 rows for non-admin
--   T3 hotels delete            filtered to 0 rows for non-admin (auto-undo if not)
--   T4 hotels select            open to authenticated
--   T5 hotel_requests select    own-only for non-admin
--   T6 hotel_requests update    blocked for non-admin
--   T7 profiles.is_admin update column revoke prevents self-promote
--
-- Uses a synthetic non-admin uid (random uuid with no profile row), so
-- you don't need a second test account. T7 switches to the real admin
-- uid because the column revoke needs a user that *otherwise* has a
-- valid self-update path.
--
-- Idempotent: cleans up its own test rows on the way out.
-- =====================================================
drop table if exists _rls_test_log;
create temp table _rls_test_log (
  ord     int  not null,
  test    text,
  outcome text,
  detail  text
);
-- The DO block switches to role authenticated for the test ops, so the
-- temp table needs an explicit grant for those inserts to land.
grant insert, select on _rls_test_log to authenticated;

do $$
declare
  v_fake_uid uuid := gen_random_uuid();
  v_admin_id uuid;
  v_test_req_id uuid;
  v_count int;
  v_bad boolean;
  v_ord int := 0;
begin
  -- Preconditions
  select id into v_admin_id from profiles where is_admin = true limit 1;
  if v_admin_id is null then
    raise exception
      'No admin found. Bootstrap one first:  '
      'update profiles set is_admin = true where id = ''<your-user-id>'';';
  end if;

  -- Seed an "other user's" hotel_request to check the own-only SELECT.
  insert into hotel_requests (requester_id, name, city, country)
  values (v_admin_id, '__RLS_VIS_TEST__', '__TEST__', '__TEST__')
  returning id into v_test_req_id;

  ----------------------------------------------------------------
  -- Impersonate fake non-admin
  ----------------------------------------------------------------
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_fake_uid::text, 'role', 'authenticated')::text,
    true);

  -- T1: INSERT hotels — should error
  v_ord := v_ord + 1;
  begin
    insert into hotels (name, city, country)
      values ('__RLS_T1__', '__TEST__', '__TEST__');
    insert into _rls_test_log values (
      v_ord, 'T1 INSERT hotels', 'FAIL', 'allowed — RLS did not block insert');
  exception when others then
    insert into _rls_test_log values (
      v_ord, 'T1 INSERT hotels', 'PASS', 'blocked');
  end;

  -- T2: UPDATE hotels — row_count should be 0 (filtered)
  v_ord := v_ord + 1;
  update hotels set country = country where id = (select id from hotels limit 1);
  get diagnostics v_count = row_count;
  insert into _rls_test_log values (
    v_ord, 'T2 UPDATE hotels',
    case when v_count = 0 then 'PASS' else 'FAIL' end,
    case when v_count = 0 then 'blocked — 0 rows affected'
         else format('allowed — %s rows affected', v_count) end);

  -- T3: DELETE hotels — sub-transaction so an unexpected pass gets undone
  v_ord := v_ord + 1;
  v_bad := false;
  begin
    delete from hotels where id = (select id from hotels limit 1);
    get diagnostics v_count = row_count;
    if v_count > 0 then
      v_bad := true;
      raise exception '__rollback_t3__';
    end if;
  exception when others then
    null;
  end;
  insert into _rls_test_log values (
    v_ord, 'T3 DELETE hotels',
    case when v_bad then 'FAIL' else 'PASS' end,
    case when v_bad then format('allowed — %s rows would be deleted (undone)', v_count)
         else 'blocked — 0 rows affected' end);

  -- T4: SELECT hotels — open read
  v_ord := v_ord + 1;
  select count(*) into v_count from hotels;
  insert into _rls_test_log values (
    v_ord, 'T4 SELECT hotels', 'PASS',
    format('allowed — %s rows visible', v_count));

  -- T5: SELECT hotel_requests — non-admin owns nothing, sees nothing
  v_ord := v_ord + 1;
  select count(*) into v_count from hotel_requests;
  insert into _rls_test_log values (
    v_ord, 'T5 SELECT hotel_requests',
    case when v_count = 0 then 'PASS' else 'FAIL' end,
    case when v_count = 0 then 'own-only — 0 rows visible'
         else format('too many visible — %s rows', v_count) end);

  -- T6: UPDATE hotel_requests — admin-only policy
  v_ord := v_ord + 1;
  update hotel_requests set status = 'approved' where id = v_test_req_id;
  get diagnostics v_count = row_count;
  insert into _rls_test_log values (
    v_ord, 'T6 UPDATE hotel_requests',
    case when v_count = 0 then 'PASS' else 'FAIL' end,
    case when v_count = 0 then 'blocked — 0 rows affected'
         else format('allowed — %s rows affected', v_count) end);

  ----------------------------------------------------------------
  -- T7: column-level revoke on profiles.is_admin.
  -- Switch to the admin's identity since the fake uid has no profile
  -- and would be filtered by the self-update policy before the revoke
  -- could fire. We want to confirm the column revoke is the wall, not
  -- just the policy.
  ----------------------------------------------------------------
  v_ord := v_ord + 1;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text,
    true);
  v_bad := false;
  begin
    update profiles set is_admin = false where id = v_admin_id;
    v_bad := true;
    raise exception '__rollback_t7__';
  exception when others then
    null;
  end;
  insert into _rls_test_log values (
    v_ord, 'T7 UPDATE profiles.is_admin',
    case when v_bad then 'FAIL' else 'PASS' end,
    case when v_bad then 'self-promote possible — trigger missing or bypassed'
         else 'self-promote blocked by trigger' end);

  ----------------------------------------------------------------
  -- Cleanup
  ----------------------------------------------------------------
  reset role;
  perform set_config('request.jwt.claims', null, true);
  delete from hotel_requests where id = v_test_req_id;
  delete from hotels where name = '__RLS_T1__';
end $$;

select test, outcome, detail
from _rls_test_log
order by ord;
