import { isSupabaseConfigured, supabase } from './supabase';

export interface ReferralRedeemSuccess {
  ok: true;
  kind: 'referral';
  referrerName: string;
  /**
   * True when the redeemer's 7-day pass has been granted now (profile already
   * complete). False when the redeemer still has to finish onboarding before
   * the pass kicks in — see reward_redeemer_on_register trigger.
   */
  passGranted: boolean;
}

export interface TesterRedeemSuccess {
  ok: true;
  kind: 'tester';
  /** ISO timestamp the granted tester pass expires at. */
  expiresAt: string;
  /**
   * True when the caller already had an active tester pass at the time of
   * redemption — no new row was inserted; we just surface the existing one
   * so the same code on a second device doesn't stack passes.
   */
  alreadyActive: boolean;
}

export type RedeemSuccess = ReferralRedeemSuccess | TesterRedeemSuccess;

export interface RedeemFailure {
  ok: false;
  error: string;
}

export type RedeemResult = RedeemSuccess | RedeemFailure;

export interface MyReferral {
  id: string;
  referredFirstName: string;
  rewarded: boolean;
  createdAt: string;
}

/**
 * Redeem a code as the current user.
 *
 * Calls the server-side `claim_code` RPC which dispatches: if the input
 * matches the hard-coded internal tester string from
 * supabase/tester_code.sql, the caller gets a 90-day tester pass; otherwise
 * the call falls through to the existing referral logic (insert a referral
 * row + grant the redeemer a 7-day pass; the referrer is paid later when
 * the redeemer posts their first activity).
 *
 * The discriminated union on the success result lets the UI render
 * different copy for tester vs referral redemptions.
 */
export async function redeemCode(code: string): Promise<RedeemResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Supabase not configured.' };
  }
  const { data, error } = await supabase.rpc('claim_code', { p_code: code });
  if (error) {
    return { ok: false, error: error.message };
  }
  const payload = data as
    | {
        ok: true;
        kind: 'referral';
        referrer_name: string;
        pass_granted?: boolean;
      }
    | {
        ok: true;
        kind: 'tester';
        expires_at: string;
        already_active: boolean;
      }
    | { ok: false; error: string };

  if (!payload.ok) {
    return { ok: false, error: payload.error };
  }
  if (payload.kind === 'tester') {
    return {
      ok: true,
      kind: 'tester',
      expiresAt: payload.expires_at,
      alreadyActive: payload.already_active,
    };
  }
  return {
    ok: true,
    kind: 'referral',
    referrerName: payload.referrer_name,
    passGranted: payload.pass_granted === true,
  };
}

/**
 * People I've referred (i.e. they redeemed my code).
 */
export async function listMyReferrals(userId: string): Promise<MyReferral[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('referrals')
    .select(
      `id, rewarded, created_at,
       referred:profiles!referrals_referred_id_fkey(first_name)`,
    )
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  type Row = {
    id: string;
    rewarded: boolean;
    created_at: string;
    referred: { first_name: string } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    referredFirstName: r.referred?.first_name ?? 'Someone',
    rewarded: r.rewarded,
    createdAt: r.created_at,
  }));
}
