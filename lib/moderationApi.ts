import { isSupabaseConfigured, supabase } from './supabase';

// =====================================================
// Blocks
// =====================================================

/**
 * Block a user. After this returns, the blocked user's activities are
 * hidden from the caller's Discover feed and their messages disappear
 * from any shared conversations (server-side via RLS — see
 * supabase/blocks_and_reports.sql).
 */
export async function blockUser(blockedUserId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  if (!me) throw new Error('Not signed in');
  if (me === blockedUserId) throw new Error('You cannot block yourself.');

  const { error } = await supabase.from('blocks').insert({
    blocker_id: me,
    blocked_id: blockedUserId,
  });
  if (error) {
    // 23505 = unique violation (already blocked) — treat as success.
    if ((error as { code?: string }).code === '23505') return;
    throw error;
  }
}

export async function unblockUser(blockedUserId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  if (!me) throw new Error('Not signed in');
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', me)
    .eq('blocked_id', blockedUserId);
  if (error) throw error;
}

export interface BlockedUser {
  id: string;
  firstName: string;
  avatarUri: string | null;
  blockedAt: string;
}

/**
 * Everyone the caller has blocked, most-recently-blocked first. Used by
 * the Blocked users management screen.
 */
export async function listBlockedUsers(): Promise<BlockedUser[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  if (!me) return [];

  const { data, error } = await supabase
    .from('blocks')
    .select(
      `blocked_id, created_at,
       blocked:profiles!blocks_blocked_id_fkey(first_name, avatar_url)`,
    )
    .eq('blocker_id', me)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[moderation] list blocks failed', error.message);
    return [];
  }

  type Row = {
    blocked_id: string;
    created_at: string;
    blocked: { first_name: string; avatar_url: string | null } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.blocked != null)
    .map((r) => ({
      id: r.blocked_id,
      firstName: r.blocked!.first_name,
      avatarUri: r.blocked!.avatar_url,
      blockedAt: r.created_at,
    }));
}

/**
 * Whether the caller has blocked the given user. Used by UI to flip the
 * Block button into an Unblock state.
 */
export async function isBlocked(otherUserId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  if (!me) return false;
  const { data, error } = await supabase
    .from('blocks')
    .select('blocker_id')
    .eq('blocker_id', me)
    .eq('blocked_id', otherUserId)
    .maybeSingle();
  if (error || !data) return false;
  return true;
}

// =====================================================
// Reports
// =====================================================

export type ReportReason =
  | 'harassment'
  | 'sexual'
  | 'spam'
  | 'impersonation'
  | 'underage'
  | 'other';

export interface ReportInput {
  /** Set exactly one of these. */
  userId?: string;
  activityId?: string;
  messageId?: string;
  reason: ReportReason;
  details?: string;
}

/**
 * Submit a report. The owner reviews these in the Supabase dashboard
 * (status = 'pending') and acts manually — there is no automated
 * moderation in v1.
 */
export async function submitReport(input: ReportInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  if (!me) throw new Error('Not signed in');

  const targetCount =
    (input.userId ? 1 : 0) +
    (input.activityId ? 1 : 0) +
    (input.messageId ? 1 : 0);
  if (targetCount === 0) throw new Error('Pick something to report.');

  const { error } = await supabase.from('reports').insert({
    reporter_id: me,
    reported_user_id: input.userId ?? null,
    reported_activity_id: input.activityId ?? null,
    reported_message_id: input.messageId ?? null,
    reason: input.reason,
    details: input.details?.trim() ? input.details.trim() : null,
  });
  if (error) throw error;
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: 'Harassment or threats',
  sexual: 'Sexual or explicit content',
  spam: 'Spam or solicitation',
  impersonation: 'Impersonation',
  underage: 'Appears to be under 13',
  other: 'Something else',
};
