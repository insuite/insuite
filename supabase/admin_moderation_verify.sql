-- =====================================================
-- RLS verification for admin_moderation.sql.
--
-- Paste into Supabase Dashboard → SQL Editor and Run. The final SELECT
-- returns a PASS / FAIL row per test in the Results panel.
--
-- What's checked (all from the perspective of a synthetic non-admin
-- uid that has no profile row, so it's "not admin" by definition):
--
--   T1 SELECT messages         non-admin still scoped to participants
--   T2 SELECT conversations    non-admin still scoped to participants
--   T3 DELETE messages         non-admin blocked (no base policy)
--   T4 DELETE activities       non-admin can't delete other people's
--   T5 UPDATE profiles         non-admin can't edit other profiles
--   T6 UPDATE profiles is_admin
--                              admin self-promotion still blocked by
--                              the trigger, even though the new
--                              "profiles admin update" policy lets
--                              admins UPDATE any row
--
-- Idempotent: cleans up the seeded rows on the way out.
-- =====================================================
drop table if exists _rls_moderation_test_log;
create temp table _rls_moderation_test_log (
  ord     int  not null,
  test    text,
  outcome text,
  detail  text
);
grant insert, select on _rls_moderation_test_log to authenticated;

do $$
declare
  v_fake_uid       uuid := gen_random_uuid();
  v_admin_id       uuid;
  v_admin_other_id uuid;
  v_seed_hotel_id  uuid;
  v_seed_act_id    uuid;
  v_seed_conv_id   uuid;
  v_seed_msg_id    uuid;
  v_count          int;
  v_bad            boolean;
  v_ord            int := 0;
  v_admin_was      boolean;
begin
  select id into v_admin_id from profiles where is_admin = true limit 1;
  if v_admin_id is null then
    raise exception
      'No admin found. Bootstrap one first:  '
      'update profiles set is_admin = true where id = ''<your-user-id>'';';
  end if;

  -- A second profile row to play "the other party" in a conversation +
  -- "victim" of a non-admin's UPDATE attempt. Reuses an existing non-
  -- admin if one exists, otherwise temporarily promotes — but we only
  -- need the id, so prefer reusing.
  select id into v_admin_other_id
  from profiles
  where id <> v_admin_id
  limit 1;
  if v_admin_other_id is null then
    raise exception
      'Need at least one non-admin profile to test against. Sign in '
      'with a second account first.';
  end if;

  -- Seed a hotel + activity + conversation + message between the admin
  -- and the other profile. These mirror real schema FKs so the inserts
  -- below succeed even if the catalog tables are otherwise empty.
  insert into hotels (name, city, country)
  values ('__RLS_MOD_TEST_HOTEL__', '__test_city__', '__test_country__')
  returning id into v_seed_hotel_id;

  insert into activities (host_id, hotel_id, venue, date, time_from, time_to)
  values (v_admin_id, v_seed_hotel_id, 'pool', current_date + 1, '10:00', '11:00')
  returning id into v_seed_act_id;

  insert into conversations (activity_id, participant_a, participant_b)
  values (v_seed_act_id, v_admin_id, v_admin_other_id)
  returning id into v_seed_conv_id;

  insert into messages (conversation_id, sender_id, content)
  values (v_seed_conv_id, v_admin_id, '__RLS_MOD_TEST_MSG__')
  returning id into v_seed_msg_id;

  ----------------------------------------------------------------
  -- Impersonate fake non-admin
  ----------------------------------------------------------------
  set local role authenticated;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_fake_uid::text, 'role', 'authenticated')::text,
    true);

  -- T1: SELECT messages — fake uid is not in the conversation and is
  -- not admin, so the seeded message must be invisible.
  v_ord := v_ord + 1;
  select count(*) into v_count from messages where id = v_seed_msg_id;
  insert into _rls_moderation_test_log values (
    v_ord, 'T1 SELECT messages',
    case when v_count = 0 then 'PASS' else 'FAIL' end,
    case when v_count = 0 then 'participant-only — seeded message hidden'
         else 'leaked — non-participant can read message' end);

  -- T2: SELECT conversations — same logic.
  v_ord := v_ord + 1;
  select count(*) into v_count from conversations where id = v_seed_conv_id;
  insert into _rls_moderation_test_log values (
    v_ord, 'T2 SELECT conversations',
    case when v_count = 0 then 'PASS' else 'FAIL' end,
    case when v_count = 0 then 'participant-only — seeded conversation hidden'
         else 'leaked — non-participant can read conversation' end);

  -- T3: DELETE messages — base schema has no DELETE policy at all,
  -- and the new admin policy excludes our fake uid. Sub-txn so an
  -- accidental success rolls back.
  v_ord := v_ord + 1;
  v_bad := false;
  begin
    delete from messages where id = v_seed_msg_id;
    get diagnostics v_count = row_count;
    if v_count > 0 then
      v_bad := true;
      raise exception '__rollback_t3__';
    end if;
  exception when others then
    null;
  end;
  insert into _rls_moderation_test_log values (
    v_ord, 'T3 DELETE messages',
    case when v_bad then 'FAIL' else 'PASS' end,
    case when v_bad then format('allowed — %s rows would delete (undone)', v_count)
         else 'blocked — no policy admits non-admin' end);

  -- T4: DELETE activities — admin policy excludes our fake uid; the
  -- "activities delete own" policy excludes it because it's not the
  -- host. Sub-txn.
  v_ord := v_ord + 1;
  v_bad := false;
  begin
    delete from activities where id = v_seed_act_id;
    get diagnostics v_count = row_count;
    if v_count > 0 then
      v_bad := true;
      raise exception '__rollback_t4__';
    end if;
  exception when others then
    null;
  end;
  insert into _rls_moderation_test_log values (
    v_ord, 'T4 DELETE activities',
    case when v_bad then 'FAIL' else 'PASS' end,
    case when v_bad then format('allowed — %s rows would delete (undone)', v_count)
         else 'blocked — non-host non-admin' end);

  -- T5: UPDATE profiles — admin override only fires for is_admin=true
  -- callers; "profiles update own" needs auth.uid()=id. Fake uid
  -- satisfies neither, so the update silently affects 0 rows.
  v_ord := v_ord + 1;
  update profiles set bio = '__RLS_MOD_TEST_T5__' where id = v_admin_other_id;
  get diagnostics v_count = row_count;
  insert into _rls_moderation_test_log values (
    v_ord, 'T5 UPDATE profiles',
    case when v_count = 0 then 'PASS' else 'FAIL' end,
    case when v_count = 0 then 'blocked — 0 rows affected'
         else format('allowed — %s rows updated (RLS bypass)', v_count) end);

  ----------------------------------------------------------------
  -- T6: switch to the *real* admin and verify is_admin self-promotion
  -- is still blocked by the trigger from admin_role.sql, even though
  -- the new "profiles admin update" policy lets admins UPDATE rows
  -- they don't own.
  ----------------------------------------------------------------
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text,
    true);

  v_ord := v_ord + 1;
  v_bad := false;
  begin
    update profiles set is_admin = true where id = v_admin_other_id;
    -- Trigger raises if it works around column-revoke + the policy
    -- says yes, so reaching this line means the wall fell.
    v_bad := true;
    raise exception '__rollback_t6__';
  exception when others then
    null;
  end;
  -- Read back to be sure nothing flipped.
  select is_admin into v_admin_was from profiles where id = v_admin_other_id;
  insert into _rls_moderation_test_log values (
    v_ord, 'T6 admin promote-other via UPDATE',
    case when v_bad or v_admin_was then 'FAIL' else 'PASS' end,
    case when v_admin_was then 'flag flipped — promotion succeeded'
         when v_bad      then 'update returned no error (trigger bypassed)'
         else 'blocked by block_is_admin_self_assignment trigger' end);

  ----------------------------------------------------------------
  -- Cleanup
  ----------------------------------------------------------------
  reset role;
  perform set_config('request.jwt.claims', null, true);
  delete from messages       where id = v_seed_msg_id;
  delete from conversations  where id = v_seed_conv_id;
  delete from activities     where id = v_seed_act_id;
  delete from hotels         where id = v_seed_hotel_id;
  -- T5 may have written a bio if the policy was broken; defensive
  -- reset only when our marker is the current value.
  update profiles set bio = null
    where id = v_admin_other_id and bio = '__RLS_MOD_TEST_T5__';
end $$;

select test, outcome, detail
from _rls_moderation_test_log
order by ord;
