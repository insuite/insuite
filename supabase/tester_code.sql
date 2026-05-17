-- =====================================================
-- Tester code → 90-day pass.
--
-- Extends /plans/redeem to accept a long internal "backstage" code that
-- grants a 90-day pass (type 'tester_90'). Useful for QA, internal
-- demos, and unblocking smoke tests where a tester account needs to
-- post more than one activity without buying a Trip Pass.
--
-- The code itself is the hard-coded constant `c_tester` inside the
-- claim_code() function below. Edit the literal before applying if you
-- want a different string. Anything that reaches this RPC and doesn't
-- match the constant falls through to the existing claim_referral().
--
-- Why a 90-day pass row (not the profiles.is_unlimited flag):
--   * Expires automatically — no Dashboard task to remember.
--   * Shows up in the normal pass-status UI so the tester sees what
--     they have.
--   * Doesn't reveal "this is a tester" via a profile flag visible to
--     anyone who can read the profiles row.
--
-- Idempotent — safe to re-run.
-- =====================================================

-- 1. Allow 'tester_90' in the passes type check.
--    Mirrors the pattern in passes_policies.sql: drop + recreate with
--    the broader allow-list.
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
      'pass_30',
      'tester_90'
    )
  );

-- 2. claim_code RPC — single entry point for the redeem screen. Tries the
--    tester-code fast path first (constant-string compare, no DB hit on
--    miss); on miss, delegates to the existing claim_referral logic.
--
--    Tester codes are long underscore-separated strings; they don't
--    overlap with the short alphanumeric referral codes (firstname +
--    digit), so the fast path can't accidentally swallow a referral.
create or replace function public.claim_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller     uuid := auth.uid();
  v_normalised text := upper(trim(coalesce(p_code, '')));
  v_expires    timestamptz;
  v_referral   jsonb;
  c_tester     constant text := 'LOVEJU9';
begin
  if v_caller is null then
    return json_build_object('ok', false, 'error', 'Not signed in.');
  end if;

  if v_normalised = '' then
    return json_build_object('ok', false, 'error', 'Enter a code.');
  end if;

  -- Tester code path.
  if v_normalised = c_tester then
    -- Idempotent: surface an active tester pass instead of inserting
    -- a duplicate. Tester re-entering the code on a second device
    -- shouldn't stack passes.
    select expires_at into v_expires
      from passes
      where user_id = v_caller
        and type = 'tester_90'
        and expires_at > now()
      order by expires_at desc
      limit 1;

    if v_expires is not null then
      return json_build_object(
        'ok', true,
        'kind', 'tester',
        'expires_at', v_expires,
        'already_active', true
      );
    end if;

    v_expires := now() + interval '90 days';
    insert into passes (user_id, type, starts_at, expires_at)
    values (v_caller, 'tester_90', now(), v_expires);
    return json_build_object(
      'ok', true,
      'kind', 'tester',
      'expires_at', v_expires,
      'already_active', false
    );
  end if;

  -- Not a tester code — delegate to the existing referral RPC. Tag
  -- the success payload with kind='referral' so the client can branch
  -- success copy.
  v_referral := public.claim_referral(p_code)::jsonb;
  if (v_referral->>'ok')::boolean then
    return (v_referral || jsonb_build_object('kind', 'referral'))::json;
  end if;
  return v_referral::json;
end;
$$;

revoke all on function public.claim_code(text) from public;
grant execute on function public.claim_code(text) to authenticated;
