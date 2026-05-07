-- =====================================================
-- Referral system v2 — run once in Supabase SQL Editor.
-- Adds:
--   1. profiles.is_unlimited (godmode flag for owner / test accounts).
--   2. referrals.redeemer_rewarded (so the redeemer's free pass is gated on
--      successful onboarding rather than granted at claim time — anti-fraud).
--   3. grant_or_extend_pass() helper that EXTENDS an existing active pass
--      by N days instead of inserting a parallel row, so multiple referrals
--      stack instead of overwriting.
--   4. claim_referral RPC (replaces v1) — grants the 7-day pass only if the
--      caller's profile is already complete; otherwise leaves redeemer_rewarded
--      = false and lets the profiles trigger grant it on registration.
--   5. reward_redeemer_on_register trigger on profiles — fires when a profile
--      transitions from "incomplete" to "complete" (first_name + ≥1 language +
--      ≥1 open_to) and there's an unrewarded referral for that redeemer.
--   6. reward_referrer_on_first_activity (replaces v1) — same trigger as before
--      but now uses grant_or_extend_pass so referrers stack 7-day chunks.
-- =====================================================

-- 1. Schema additions ----------------------------------------------------------

alter table profiles
  add column if not exists is_unlimited boolean not null default false;

alter table referrals
  add column if not exists redeemer_rewarded boolean not null default false;

-- Backfill existing rows: anything created under v1 already paid out the
-- redeemer's pass at claim time, so mark them rewarded.
update referrals set redeemer_rewarded = true where redeemer_rewarded = false;

-- 2. Helper: grant a pass, or extend the active one by N days ------------------

create or replace function grant_or_extend_pass(
  p_user  uuid,
  p_type  text,
  p_days  int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pass_id     uuid;
  v_expires_at  timestamptz;
begin
  if p_user is null or p_days is null or p_days <= 0 then
    return;
  end if;

  -- Look for any currently-active pass (any type) — the most-recently-expiring
  -- one is what getActivePass() picks up, so extend that.
  select id, expires_at
    into v_pass_id, v_expires_at
  from passes
  where user_id = p_user
    and expires_at > now()
  order by expires_at desc
  limit 1;

  if v_pass_id is null then
    insert into passes (user_id, type, starts_at, expires_at)
    values (p_user, p_type, now(), now() + make_interval(days => p_days));
  else
    update passes
       set expires_at = v_expires_at + make_interval(days => p_days)
     where id = v_pass_id;
  end if;
end;
$$;

revoke all on function grant_or_extend_pass(uuid, text, int) from public;

-- 3. claim_referral RPC --------------------------------------------------------

create or replace function claim_referral(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller          uuid := auth.uid();
  v_normalised      text := upper(trim(p_code));
  v_referrer        uuid;
  v_referrer_name   text;
  v_my_code         text;
  v_existing_count  int;
  v_first_name      text;
  v_languages       text[];
  v_open_to         text[];
  v_is_complete     boolean;
begin
  if v_caller is null then
    return json_build_object('ok', false, 'error', 'Not signed in.');
  end if;

  if v_normalised = '' then
    return json_build_object('ok', false, 'error', 'Enter a code.');
  end if;

  -- Block redeeming your own code.
  select referral_code, first_name, languages, open_to
    into v_my_code, v_first_name, v_languages, v_open_to
  from profiles where id = v_caller;

  if upper(coalesce(v_my_code, '')) = v_normalised then
    return json_build_object('ok', false, 'error', 'You cannot redeem your own code.');
  end if;

  -- Find referrer by code (case-insensitive).
  select id, first_name into v_referrer, v_referrer_name
  from profiles
  where upper(referral_code) = v_normalised;

  if v_referrer is null then
    return json_build_object('ok', false, 'error', 'Code not found.');
  end if;

  -- One referral per redeemer.
  select count(*) into v_existing_count from referrals where referred_id = v_caller;
  if v_existing_count > 0 then
    return json_build_object('ok', false, 'error', 'You have already redeemed a code.');
  end if;

  -- Is the redeemer's profile complete enough to count as "registered"?
  v_is_complete :=
    coalesce(v_first_name, '') <> ''
    and coalesce(array_length(v_languages, 1), 0) >= 1
    and coalesce(array_length(v_open_to, 1), 0) >= 1;

  -- Record the referral. The referrer's pass remains pending until the
  -- redeemer posts their first activity (existing trigger). The redeemer's
  -- pass is granted now if they've already finished onboarding, otherwise
  -- the profiles trigger will hand it over once they complete it.
  insert into referrals (referrer_id, referred_id, code, rewarded, redeemer_rewarded)
  values (v_referrer, v_caller, v_normalised, false, v_is_complete);

  if v_is_complete then
    perform grant_or_extend_pass(v_caller, 'referral_7', 7);
    return json_build_object(
      'ok', true,
      'pass_granted', true,
      'referrer_name', v_referrer_name
    );
  else
    return json_build_object(
      'ok', true,
      'pass_granted', false,
      'referrer_name', v_referrer_name
    );
  end if;
end;
$$;

revoke all on function claim_referral(text) from public;
grant execute on function claim_referral(text) to authenticated;

-- 4. Trigger: grant redeemer's pass once profile becomes complete --------------

create or replace function reward_redeemer_on_register()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was_complete  boolean := false;
  v_is_complete   boolean;
  v_referral_id   uuid;
begin
  v_is_complete :=
    coalesce(new.first_name, '') <> ''
    and coalesce(array_length(new.languages, 1), 0) >= 1
    and coalesce(array_length(new.open_to, 1), 0) >= 1;

  if not v_is_complete then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_was_complete :=
      coalesce(old.first_name, '') <> ''
      and coalesce(array_length(old.languages, 1), 0) >= 1
      and coalesce(array_length(old.open_to, 1), 0) >= 1;

    -- Already-complete → still complete: nothing to do.
    if v_was_complete then
      return new;
    end if;
  end if;

  -- Profile just transitioned to "complete". If there's a referral pending
  -- the redeemer's reward, hand it over.
  select id into v_referral_id
  from referrals
  where referred_id = new.id
    and redeemer_rewarded = false
  limit 1;

  if v_referral_id is null then
    return new;
  end if;

  perform grant_or_extend_pass(new.id, 'referral_7', 7);
  update referrals set redeemer_rewarded = true where id = v_referral_id;

  return new;
end;
$$;

drop trigger if exists profiles_reward_redeemer on profiles;
create trigger profiles_reward_redeemer
  after insert or update on profiles
  for each row execute function reward_redeemer_on_register();

-- 5. Trigger: grant referrer's pass when redeemer posts first activity ---------
--    (Same intent as v1; rewritten to use grant_or_extend_pass for stacking.)

create or replace function reward_referrer_on_first_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity_count  int;
  v_referrer        uuid;
  v_referral_id     uuid;
begin
  select count(*) into v_activity_count
  from activities
  where host_id = new.host_id;

  if v_activity_count <> 1 then
    return new;
  end if;

  select id, referrer_id
    into v_referral_id, v_referrer
  from referrals
  where referred_id = new.host_id
    and rewarded = false
  limit 1;

  if v_referrer is null then
    return new;
  end if;

  update referrals set rewarded = true where id = v_referral_id;
  perform grant_or_extend_pass(v_referrer, 'referral_7', 7);

  return new;
end;
$$;

drop trigger if exists activities_reward_referrer on activities;
create trigger activities_reward_referrer
  after insert on activities
  for each row execute function reward_referrer_on_first_activity();
