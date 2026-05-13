/**
 * Admin-only operations on the hotels catalog + hotel_requests queue.
 *
 * Every call here goes through Supabase as the signed-in user; the writes
 * succeed only when the admin RLS policies in supabase/admin_role.sql kick
 * in (profile.is_admin = true). Non-admins get a Postgres permission error,
 * which the UI surfaces to the user.
 */

import {
  assertHotelInput,
  buildReportTarget,
  normalizeHotelInput,
  REPORT_REASON_LABELS,
  type HotelInput,
  type ReportReason,
  type ReportTarget,
  type ReportTargetSource,
} from './adminApi.helpers';
import { isSupabaseConfigured, supabase, type Database } from './supabase';

// Re-export the pure types/values from helpers so existing call sites
// (`import { ReportReason } from '@/lib/adminApi'` etc.) keep working.
export type { ReportReason, ReportTarget };
export { REPORT_REASON_LABELS };

export type HotelRequestStatus = 'pending' | 'approved' | 'rejected';

export interface HotelRequestSummary {
  id: string;
  requesterId: string;
  requesterName: string;
  name: string;
  city: string;
  country: string;
  notes: string | null;
  status: HotelRequestStatus;
  createdAt: string;
  reviewedAt: string | null;
}

/**
 * Insert a hotel. Dedups case-insensitively by (name, city) — if an entry
 * already exists, returns that id instead of inserting a second row. This
 * matches the spirit of the catalog migrations, which all use
 * `where not exists` for the same reason.
 */
export async function addHotel(
  input: HotelInput,
): Promise<{ id: string; created: boolean }> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Not connected to Supabase.');
  }
  const trimmed = normalizeHotelInput(input);
  assertHotelInput(trimmed);

  const { data: existing, error: lookupErr } = await supabase
    .from('hotels')
    .select('id')
    .ilike('name', trimmed.name)
    .ilike('city', trimmed.city)
    .maybeSingle();
  if (lookupErr) throw lookupErr;
  if (existing) return { id: existing.id, created: false };

  const { data, error } = await supabase
    .from('hotels')
    .insert(trimmed)
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id, created: true };
}

export async function updateHotel(
  id: string,
  patch: Partial<HotelInput>,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Not connected to Supabase.');
  }
  const dbPatch: Database['public']['Tables']['hotels']['Update'] = {};
  if (patch.name !== undefined) dbPatch.name = patch.name.trim();
  if (patch.city !== undefined) dbPatch.city = patch.city.trim();
  if (patch.country !== undefined) dbPatch.country = patch.country.trim();
  const { error } = await supabase.from('hotels').update(dbPatch).eq('id', id);
  if (error) throw error;
}

/**
 * Count of activity rows pointing to this hotel — used by the UI to warn
 * before delete (the FK has no ON DELETE CASCADE, so the delete would
 * otherwise blow up with a 23503).
 */
export async function countActivitiesAtHotel(hotelId: string): Promise<number> {
  if (!isSupabaseConfigured || !supabase) return 0;
  const { count, error } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('hotel_id', hotelId);
  if (error) throw error;
  return count ?? 0;
}

export async function deleteHotel(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Not connected to Supabase.');
  }
  const { error } = await supabase.from('hotels').delete().eq('id', id);
  if (error) {
    // Postgres FK violation. Friendlier message than the raw error.
    if ((error as { code?: string }).code === '23503') {
      throw new Error(
        'This hotel still has activities. Reassign or remove those first.',
      );
    }
    throw error;
  }
}

// =====================================================
// hotel_requests
// =====================================================

export async function listHotelRequests(
  status: HotelRequestStatus,
): Promise<HotelRequestSummary[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('hotel_requests')
    .select(
      `id, requester_id, name, city, country, notes, status, created_at, reviewed_at,
       requester:profiles!hotel_requests_requester_id_fkey(first_name)`,
    )
    .eq('status', status)
    .order(status === 'pending' ? 'created_at' : 'reviewed_at', {
      ascending: false,
    });
  if (error) throw error;

  type Row = {
    id: string;
    requester_id: string;
    name: string;
    city: string;
    country: string;
    notes: string | null;
    status: HotelRequestStatus;
    created_at: string;
    reviewed_at: string | null;
    requester: { first_name: string } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    requesterId: r.requester_id,
    requesterName: r.requester?.first_name ?? 'Unknown',
    name: r.name,
    city: r.city,
    country: r.country,
    notes: r.notes,
    status: r.status,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
  }));
}

/**
 * Thin shim for the landing screen's pending count. Kept as a named
 * export because the call site is well-positioned to be its own pending-
 * specific affordance even after the queue UI gained status tabs.
 */
export async function listPendingHotelRequests(): Promise<HotelRequestSummary[]> {
  return listHotelRequests('pending');
}

/**
 * Approve a request → insert (or reuse) the hotel, then mark the request
 * 'approved'. The hotel insert and the status update aren't in a DB
 * transaction (supabase-js can't do client-side transactions), but the
 * dedup in addHotel makes the operation idempotent — if the status flip
 * fails mid-way, retrying just re-approves the same request without
 * creating a second hotel row.
 *
 * Admin can edit the hotel fields (typo cleanup) before approving — pass
 * the cleaned values in `hotel`, the original request row is only used as
 * a pointer.
 */
export async function approveHotelRequest(args: {
  requestId: string;
  hotel: HotelInput;
}): Promise<{ hotelId: string }> {
  const { id } = await addHotel(args.hotel);
  if (!supabase) return { hotelId: id };
  const { error } = await supabase
    .from('hotel_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', args.requestId);
  if (error) throw error;
  return { hotelId: id };
}

export async function rejectHotelRequest(requestId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('hotel_requests')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId);
  if (error) throw error;
}

/**
 * Admin hotels list — separate from listHotels() because the catalog grew
 * past comfortable client-side filtering for a flat FlatList. Returns full
 * rows ordered by city then name, which the admin screen can paginate /
 * search over in memory (still cheap at ~440 rows).
 */
export interface AdminHotel {
  id: string;
  name: string;
  city: string;
  country: string;
  createdAt: string;
}

export async function listHotelsForAdmin(): Promise<AdminHotel[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('hotels')
    .select('id, name, city, country, created_at')
    .order('city')
    .order('name');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    country: row.country,
    createdAt: row.created_at,
  }));
}

export async function getHotelById(id: string): Promise<AdminHotel | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from('hotels')
    .select('id, name, city, country, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    city: data.city,
    country: data.country,
    createdAt: data.created_at,
  };
}

// =====================================================
// Reports — Apple Guideline 1.2 abuse-handling moderation queue.
// Read/update gated by supabase/admin_reports.sql RLS.
// =====================================================

export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

export interface ReportSummary {
  id: string;
  reporterId: string;
  reporterName: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  reviewedAt: string | null;
  target: ReportTarget;
}

export async function listReports(
  status: ReportStatus,
): Promise<ReportSummary[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('reports')
    .select(
      `id, reporter_id, reason, details, status, created_at, reviewed_at,
       reported_user_id, reported_activity_id, reported_message_id,
       reporter:profiles!reports_reporter_id_fkey(first_name),
       reported_user:profiles!reports_reported_user_id_fkey(id, first_name),
       reported_activity:activities!reports_reported_activity_id_fkey(
         id, venue, date,
         hotel:hotels!activities_hotel_id_fkey(name)
       ),
       reported_message:messages!reports_reported_message_id_fkey(
         id, conversation_id, content
       )`,
    )
    .eq('status', status)
    .order(status === 'pending' ? 'created_at' : 'reviewed_at', {
      ascending: false,
    });

  if (error) throw error;

  type Row = ReportTargetSource & {
    id: string;
    reporter_id: string;
    reason: ReportReason;
    details: string | null;
    status: ReportStatus;
    created_at: string;
    reviewed_at: string | null;
    reported_user_id: string | null;
    reported_activity_id: string | null;
    reported_message_id: string | null;
    reporter: { first_name: string } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r): ReportSummary => ({
    id: r.id,
    reporterId: r.reporter_id,
    reporterName: r.reporter?.first_name ?? 'Unknown',
    reason: r.reason,
    details: r.details,
    status: r.status,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
    target: buildReportTarget(r),
  }));
}

export async function markReportActioned(reportId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('reports')
    .update({
      status: 'actioned',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId);
  if (error) throw error;
}

export async function dismissReport(reportId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('reports')
    .update({
      status: 'dismissed',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId);
  if (error) throw error;
}

/**
 * Used by the landing screen badge — same shape as
 * listPendingHotelRequests's shim.
 */
export async function listPendingReports(): Promise<ReportSummary[]> {
  return listReports('pending');
}

// =====================================================
// Moderation actions — wired into /activity/[id], /messages/[id], and
// /user/[id] when the signed-in user is admin. RLS in
// supabase/admin_moderation.sql is what actually authorises these;
// non-admins calling them get a Postgres permission error / 0-row
// update.
// =====================================================

/**
 * Cancel any activity (admin override of the host-only path in
 * activitiesApi.cancelActivity). Activity stays in the DB so guests
 * still see the "cancelled" banner instead of a 404.
 */
export async function adminCancelActivity(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('activities')
    .update({ status: 'cancelled' })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Permanently remove an activity, regardless of host. Cascades into
 * join_requests and conversations (and via them, messages) per the
 * schema FKs — same blast radius as the host-side delete.
 */
export async function adminDeleteActivity(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from('activities').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Delete a single message. There's no user-facing delete-message
 * feature, so this only succeeds for admins (per the new RLS).
 * Single-message takedown so the rest of the conversation stays intact.
 */
export async function adminDeleteMessage(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from('messages').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Clear a user's avatar. Sets avatar_url to null; the row in storage
 * is left orphaned (a periodic cleanup job is out of scope here — the
 * URL in the DB is what the app actually reads).
 */
export async function adminClearUserAvatar(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId);
  if (error) throw error;
}

export async function adminClearUserBio(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('profiles')
    .update({ bio: null })
    .eq('id', userId);
  if (error) throw error;
}

// =====================================================
// Admin chat read — bypasses the participant scope of messagesApi so
// /admin can open any conversation behind a reported message.
// =====================================================

export interface AdminChatParticipant {
  id: string;
  firstName: string;
  initial: string;
  avatarUri: string | null;
}

export interface AdminChatContext {
  conversationId: string;
  activityId: string | null;
  participantA: AdminChatParticipant;
  participantB: AdminChatParticipant;
  /** Pretty venue / date / time line for the chat header. */
  venueContext: string | null;
}

export interface AdminChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export async function getAdminConversation(
  conversationId: string,
): Promise<AdminChatContext | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from('conversations')
    .select(
      `id, activity_id, participant_a, participant_b,
       a:profiles!conversations_participant_a_fkey(id, first_name, avatar_url),
       b:profiles!conversations_participant_b_fkey(id, first_name, avatar_url),
       activity:activities!conversations_activity_id_fkey(venue, date, time_from, time_to)`,
    )
    .eq('id', conversationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  type Row = {
    id: string;
    activity_id: string | null;
    participant_a: string;
    participant_b: string;
    a: { id: string; first_name: string; avatar_url: string | null } | null;
    b: { id: string; first_name: string; avatar_url: string | null } | null;
    activity: {
      venue: string;
      date: string;
      time_from: string;
      time_to: string;
    } | null;
  };
  const row = data as unknown as Row;
  if (!row.a || !row.b) return null;

  const part = (
    p: { id: string; first_name: string; avatar_url: string | null },
  ): AdminChatParticipant => ({
    id: p.id,
    firstName: p.first_name,
    initial: (p.first_name[0] ?? '?').toUpperCase(),
    avatarUri: p.avatar_url,
  });

  const venueContext = row.activity
    ? `${row.activity.venue} · ${row.activity.date} · ${row.activity.time_from.slice(0, 5)}–${row.activity.time_to.slice(0, 5)}`
    : null;

  return {
    conversationId: row.id,
    activityId: row.activity_id,
    participantA: part(row.a),
    participantB: part(row.b),
    venueContext,
  };
}

export async function listAdminMessages(
  conversationId: string,
): Promise<AdminChatMessage[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    text: m.content,
    createdAt: m.created_at,
  }));
}

