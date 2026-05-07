import { authStore } from '@/stores/authStore';

import { isSupabaseConfigured, supabase } from './supabase';

export type PassType = 'pass_7' | 'pass_14' | 'pass_30' | 'referral_7' | 'free_7' | 'trip_14';

export interface Pass {
  id: string;
  type: PassType;
  startsAt: string;
  expiresAt: string;
  daysRemaining: number;
}

const DURATION_DAYS: Record<string, number> = {
  pass_7: 7,
  pass_14: 14,
  pass_30: 30,
  referral_7: 7,
  free_7: 7,
  trip_14: 14,
};

/**
 * Whether the user's profile has the unlimited (godmode) flag set. Owner /
 * test accounts get this so they can bypass the paywall — see referrals_v2.sql
 * for the column. Defaults to false on any error / unconfigured Supabase.
 */
export async function isUnlimitedUser(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('is_unlimited')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.is_unlimited === true;
}

/**
 * The user's currently-active pass (most-recently-expiring), or null if none.
 */
export async function getActivePass(userId: string): Promise<Pass | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('passes')
    .select('id, type, starts_at, expires_at')
    .eq('user_id', userId)
    .gt('expires_at', nowIso)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const expiresAt = new Date(data.expires_at);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - Date.now()) / msPerDay),
  );

  return {
    id: data.id,
    type: data.type as PassType,
    startsAt: data.starts_at,
    expiresAt: data.expires_at,
    daysRemaining,
  };
}

/**
 * How many active activities has the current user posted? Used to decide
 * whether they need a pass for the next post (first is free).
 */
export async function countOwnActivities(userId: string): Promise<number> {
  if (!isSupabaseConfigured || !supabase) return 0;
  const { count, error } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', userId);
  if (error || count == null) return 0;
  return count;
}

/**
 * Decide whether the user is allowed to post a new activity right now.
 * Free for the first activity ever, gated on an active pass thereafter.
 * Owner / test accounts with `is_unlimited = true` always pass.
 */
export async function canPostActivity(userId: string): Promise<{
  allowed: boolean;
  reason: 'unlimited' | 'first_free' | 'has_pass' | 'needs_pass';
  activePass: Pass | null;
}> {
  const [unlimited, count, pass] = await Promise.all([
    isUnlimitedUser(userId),
    countOwnActivities(userId),
    getActivePass(userId),
  ]);
  if (unlimited) return { allowed: true, reason: 'unlimited', activePass: pass };
  if (pass) return { allowed: true, reason: 'has_pass', activePass: pass };
  if (count === 0) return { allowed: true, reason: 'first_free', activePass: null };
  return { allowed: false, reason: 'needs_pass', activePass: null };
}

/**
 * Record a pass purchase. Called after the IAP transaction completes.
 *
 * NOTE: For v1 this trusts the client. Production should add a server-side
 * receipt-validation Edge Function (verify with Apple's verifyReceipt endpoint)
 * before inserting — otherwise jailbroken users could fake purchases.
 */
export async function insertPass(
  type: 'pass_7' | 'pass_14' | 'pass_30',
  appleTransactionId?: string,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const session = authStore.get().session;
  if (!session) throw new Error('Not signed in');

  const days = DURATION_DAYS[type];
  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from('passes').insert({
    user_id: session.user.id,
    type,
    starts_at: startsAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw error;

  // appleTransactionId could be stored alongside for audit / refund handling
  // once we add a column. For now we just log it.
  if (appleTransactionId) {
    console.log('[passes] recorded pass for tx', appleTransactionId);
  }
}
