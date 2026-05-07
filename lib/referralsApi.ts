import { isSupabaseConfigured, supabase } from './supabase';

export interface RedeemSuccess {
  ok: true;
  referrerName: string;
  /**
   * True when the redeemer's 7-day pass has been granted now (profile already
   * complete). False when the redeemer still has to finish onboarding before
   * the pass kicks in — see reward_redeemer_on_register trigger.
   */
  passGranted: boolean;
}

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
 * Redeem a referral code as the current user. Calls a security-definer RPC
 * which atomically: validates the code, inserts a referrals row, and gives the
 * caller a 7-day pass. The referrer's pass is granted later via DB trigger
 * when the redeemer posts their first activity.
 */
export async function redeemReferralCode(code: string): Promise<RedeemResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Supabase not configured.' };
  }
  const { data, error } = await supabase.rpc('claim_referral', {
    p_code: code,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  // RPC returns json: { ok, error?, referrer_name?, pass_granted? }
  const payload = data as
    | { ok: true; referrer_name: string; pass_granted?: boolean }
    | { ok: false; error: string };

  if (!payload.ok) {
    return { ok: false, error: payload.error };
  }
  return {
    ok: true,
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

  if (error) {
    console.warn('[referrals] list failed', error.message);
    return [];
  }

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
