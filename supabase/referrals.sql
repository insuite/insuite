-- =====================================================
-- Referral system — run once in Supabase SQL Editor.
-- Adds:
--   1. INSERT policy on referrals (caller can only insert as the referred).
--   2. claim_referral(p_code) RPC the redeemer calls — server-side, security
--      definer, so it can also insert a 7-day pass for the redeemer.
--   3. Trigger on activities: when the referred user posts their first
--      activity, mark the referral rewarded and credit the referrer with a
--      7-day pass.
-- =====================================================

-- 1. INSERT policy (defensive — RPC uses security definer so policy not strictly
-- needed for the RPC path, but useful if a future client path inserts directly).
drop policy if exists "referrals insert by referred" on referrals;
create policy "referrals insert by referred"
  on referrals for insert to authenticated with check (
    auth.uid() = referred_id
  );

-- 2. RPC: claim a referral code as the current authenticated user.
create or replace function claim_referral(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller       uuid := auth.uid();
  v_normalised   text := upper(trim(p_code));
  v_referrer     uuid;
  v_referrer_name text;
  v_my_code      text;
  v_existing_count int;
begin
  if v_caller is null then
    return json_build_object('ok', false, 'error', 'Not signed in.');
  end if;

  if v_normalised = '' then
    return json_build_object('ok', false, 'error', 'Enter a code.');
  end if;

  -- Block redeeming your own code
  select referral_code into v_my_code from profiles where id = v_caller;
  if upper(coalesce(v_my_code, '')) = v_normalised then
    return json_build_object('ok', false, 'error', 'You cannot redeem your own code.');
  end if;

  -- Find referrer by code (case-insensitive)
  select id, first_name into v_referrer, v_referrer_name
  from profiles
  where upper(referral_code) = v_normalised;

  if v_referrer is null then
    return json_build_object('ok', false, 'error', 'Code not found.');
  end if;

  -- One referral per redeemer
  select count(*) into v_existing_count from referrals where referred_id = v_caller;
  if v_existing_count > 0 then
    return json_build_object('ok', false, 'error', 'You have already redeemed a code.');
  end if;

  -- Record the referral (pending reward — referrer gets paid when redeemer
  -- posts their first activity, via the trigger below)
  insert into referrals (referrer_id, referred_id, code, rewarded)
  values (v_referrer, v_caller, v_normalised, false);

  -- Reward the redeemer immediately with a 7-day pass.
  insert into passes (user_id, type, starts_at, expires_at)
  values (v_caller, 'referral_7', now(), now() + interval '7 days');

  return json_build_object(
    'ok', true,
    'referrer_name', v_referrer_name
  );
end;
$$;

revoke all on function claim_referral(text) from public;
grant execute on function claim_referral(text) to authenticated;

-- 3. Trigger function: after a user inserts their first activity, if they have
-- an unrewarded referral, credit the referrer with a 7-day pass.
create or replace function reward_referrer_on_first_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity_count int;
  v_referrer       uuid;
  v_referral_id    uuid;
begin
  -- Count this host's activities (including the row being inserted)
  select count(*) into v_activity_count
  from activities
  where host_id = new.host_id;

  -- Only fire on the literal first activity
  if v_activity_count <> 1 then
    return new;
  end if;

  -- Look up an unrewarded referral where this user is the referred party
  select id, referrer_id into v_referral_id, v_referrer
  from referrals
  where referred_id = new.host_id and rewarded = false
  limit 1;

  if v_referrer is null then
    return new;
  end if;

  -- Mark rewarded
  update referrals set rewarded = true where id = v_referral_id;

  -- Credit the referrer with a 7-day pass
  insert into passes (user_id, type, starts_at, expires_at)
  values (v_referrer, 'referral_7', now(), now() + interval '7 days');

  return new;
end;
$$;

drop trigger if exists activities_reward_referrer on activities;
create trigger activities_reward_referrer
  after insert on activities
  for each row execute function reward_referrer_on_first_activity();
