-- =====================================================
-- RLS verification for admin_role.sql.
-- Paste into Supabase Dashboard → SQL Editor and Run.
--
-- Each test prints a ✓ / ✗ line via RAISE NOTICE.
--   ✓ = invariant holds
--   ✗ = RLS hole — investigate before shipping
--
-- What's checked:
--   T1 hotels insert            blocked for non-admin
--   T2 hotels update            filtered to 0 rows for non-admin
--   T3 hotels delete            filtered to 0 rows for non-admin (auto-undo if not)
--   T4 hotels select            open to authenticated
--   T5 hotel_requests select    own-only for non-admin
--   T6 hotel_requests update    blocked for non-admin
--   T7 profiles.is_admin update column-level revoke prevents self-promote
--
-- Uses a synthetic non-admin uid (random uuid with no profile row), so
-- you don't need to create a second test account to run this. The fake
-- uid is "not admin" by definition (the EXISTS subquery in policy can't
-- match it). Real admin uid is also touched for T7 (column revoke
-- applies to all `authenticated`, including admins).
--
-- Idempotent: cleans up its own test rows. Re-running is safe.
-- =====================================================
do $$
declare
  v_fake_uid uuid := gen_random_uuid();
  v_admin_id uuid;
  v_test_req_id uuid;
  v_count int;
  v_bad boolean;
begin
  -- Preconditions
  select id into v_admin_id from profiles where is_admin = true limit 1;
  if v_admin_id is null then
    raise exception
      'No admin found. Bootstrap one first via the Dashboard:  '
      'update profiles set is_admin = true where id = ''<your-user-id>'';';
  end if;

  -- Seed an "other user's" hotel_request (owned by the admin) so we have
  -- something to check the own-only SELECT against.
  insert into hotel_requests (requester_id, name, city, country)
  values (v_admin_id, '__RLS_VIS_TEST__', '__TEST__', '__TEST__')
  returning id into v_test_req_id;

  raise notice E'\n=== RLS verification ===';
  raise notice 'fake non-admin uid: %', v_fake_uid;
  raise notice 'real admin uid:     %', v_admin_id;

  ----------------------------------------------------------------
  -- Impersonate fake non-admin
  ----------------------------------------------------------------
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_fake_uid::text, 'role', 'authenticated')::text,
    true);

  -- T1: INSERT hotels — should raise permission_denied / RLS violation
  begin
    insert into hotels (name, city, country)
      values ('__RLS_T1__', '__TEST__', '__TEST__');
    raise notice '[T1] INSERT hotels             ✗ ALLOWED (BAD)';
  exception when others then
    raise notice '[T1] INSERT hotels             ✓ BLOCKED';
  end;

  -- T2: UPDATE hotels — no-op write; row_count should be 0 (filtered)
  update hotels set country = country where id = (select id from hotels limit 1);
  get diagnostics v_count = row_count;
  raise notice '[T2] UPDATE hotels             % (% rows affected)',
    case when v_count = 0 then '✓ BLOCKED' else '✗ ALLOWED (BAD)' end, v_count;

  -- T3: DELETE hotels — wrapped in sub-transaction so an unexpected pass
  -- doesn't actually destroy a row. v_bad survives the rollback (plpgsql
  -- variable assignments aren't rolled back by exception handling).
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
  if v_bad then
    raise notice '[T3] DELETE hotels             ✗ ALLOWED (% rows — undone)', v_count;
  else
    raise notice '[T3] DELETE hotels             ✓ BLOCKED (0 rows affected)';
  end if;

  -- T4: SELECT hotels — open read policy applies
  select count(*) into v_count from hotels;
  raise notice '[T4] SELECT hotels             ✓ ALLOWED (% rows visible)', v_count;

  -- T5: SELECT hotel_requests — non-admin sees own only. The fake uid owns
  -- nothing, so expect 0 rows (the seeded admin request must be invisible).
  select count(*) into v_count from hotel_requests;
  raise notice '[T5] SELECT hotel_requests     % (% rows visible)',
    case when v_count = 0 then '✓ OWN-ONLY' else '✗ TOO MANY (BAD)' end, v_count;

  -- T6: UPDATE hotel_requests — admin-only policy
  update hotel_requests set status = 'approved' where id = v_test_req_id;
  get diagnostics v_count = row_count;
  raise notice '[T6] UPDATE hotel_requests     % (% rows affected)',
    case when v_count = 0 then '✓ BLOCKED' else '✗ ALLOWED (BAD)' end, v_count;

  ----------------------------------------------------------------
  -- T7: column-level revoke on profiles.is_admin.
  -- Switch to the admin's own identity, because the fake uid has no
  -- profile row and the self-update policy would filter it anyway —
  -- we want to test that even a user with a valid self-update path
  -- still cannot touch the is_admin column.
  ----------------------------------------------------------------
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text,
    true);
  v_bad := false;
  begin
    update profiles set is_admin = false where id = v_admin_id;
    -- If we reach this line, the column revoke did NOT block the write.
    v_bad := true;
    raise exception '__rollback_t7__';
  exception when others then
    null;
  end;
  if v_bad then
    raise notice '[T7] UPDATE profiles.is_admin  ✗ ALLOWED (column-revoke broken — BAD)';
  else
    raise notice '[T7] UPDATE profiles.is_admin  ✓ BLOCKED';
  end if;

  ----------------------------------------------------------------
  -- Cleanup
  ----------------------------------------------------------------
  reset role;
  perform set_config('request.jwt.claims', null, true);
  delete from hotel_requests where id = v_test_req_id;
  delete from hotels where name = '__RLS_T1__';

  raise notice E'\n=== Done. All ✓ = pass; any ✗ = RLS hole. ===';
end $$;
