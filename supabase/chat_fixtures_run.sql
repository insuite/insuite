-- =====================================================
-- Chat thread fixture — Julian ↔ Yuko on the Pool activity.
--
-- Pre-flight:
--   - screenshot_fixtures_run.sql must be loaded already (this script
--     looks up Yuko's "Easy laps" Pool activity to attach to).
--   - HOST1 = Julian = 42b2c446-cebb-414d-a72d-a5f7f69e1e00
--   - HOST2 = Yuko   = 86f758e6-92aa-48ec-91f9-ff422ba18427
--
-- What this gives you:
--   - One accepted join_request: Julian → Yuko's pool activity.
--   - One conversation between them, scoped to that activity.
--   - Six messages, alternating, that read like a real meet-up plan.
--
-- Use:
--   - Sign in as either Julian or Yuko on the device. Open Messages
--     tab → tap the Yuko/Julian row → screenshot the chat. The "me"
--     bubbles (gold, right-aligned) belong to whichever account you
--     signed in as.
--
-- Cleanup:
--   - Don't need to clean separately. The 8 screenshot fixture
--     activities have ON DELETE CASCADE through join_requests →
--     conversations → messages, so screenshot_polish.sql STEP B
--     removes everything in one shot.
-- =====================================================

do $$
declare
  v_julian   uuid := '42b2c446-cebb-414d-a72d-a5f7f69e1e00';
  v_yuko     uuid := '86f758e6-92aa-48ec-91f9-ff422ba18427';
  v_activity uuid;
  v_conv     uuid;
begin
  -- Locate Yuko's "Easy laps" pool activity from the fixtures.
  select id into v_activity
  from activities
  where host_id = v_yuko
    and venue   = 'pool'
    and note like '%Easy laps%'
  order by created_at desc
  limit 1;

  if v_activity is null then
    raise exception 'No matching pool activity found for Yuko. '
      'Run screenshot_fixtures_run.sql first.';
  end if;

  -- Accepted join request: Julian → Yuko's activity. ON CONFLICT no-op
  -- so re-running this script is safe.
  insert into join_requests (activity_id, requester_id, status)
  values (v_activity, v_julian, 'accepted')
  on conflict (activity_id, requester_id) do update set status = 'accepted';

  -- Find an existing conversation for this pair on this activity, or
  -- create one. The schema's UNIQUE on (activity_id, participant_a,
  -- participant_b) doesn't account for swapped participants, so we
  -- check both orderings before inserting.
  select id into v_conv
  from conversations
  where activity_id = v_activity
    and (
      (participant_a = v_yuko   and participant_b = v_julian) or
      (participant_a = v_julian and participant_b = v_yuko)
    )
  limit 1;

  if v_conv is null then
    insert into conversations (activity_id, participant_a, participant_b)
    values (v_activity, v_yuko, v_julian)
    returning id into v_conv;
  end if;

  -- If this script has been run before, the messages already exist.
  -- Skip insertion when there's anything in the thread already so we
  -- don't duplicate them.
  if not exists (select 1 from messages where conversation_id = v_conv) then
    insert into messages (conversation_id, sender_id, content) values
      (v_conv, v_yuko,   'Hey! Heading to the pool around 4?'),
      (v_conv, v_julian, 'Yes — see you there.'),
      (v_conv, v_yuko,   'Perfect. I''ll grab us a cabana on the south side.'),
      (v_conv, v_julian, 'Bringing a book — fine if I read part of the time?'),
      (v_conv, v_yuko,   'Of course. I might do the same.'),
      (v_conv, v_julian, 'Great. See you in 30.');
  end if;
end $$;
