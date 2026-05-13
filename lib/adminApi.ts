/**
 * Admin-only operations on the hotels catalog + hotel_requests queue.
 *
 * Every call here goes through Supabase as the signed-in user; the writes
 * succeed only when the admin RLS policies in supabase/admin_role.sql kick
 * in (profile.is_admin = true). Non-admins get a Postgres permission error,
 * which the UI surfaces to the user.
 */

import { isSupabaseConfigured, supabase, type Database } from './supabase';

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

interface HotelInput {
  name: string;
  city: string;
  country: string;
}

function normalize(input: HotelInput): HotelInput {
  return {
    name: input.name.trim(),
    city: input.city.trim(),
    country: input.country.trim(),
  };
}

function assertHotelInput(t: HotelInput): void {
  if (t.name.length < 2) throw new Error('Hotel name is required.');
  if (t.city.length < 2) throw new Error('City is required.');
  if (t.country.length < 2) throw new Error('Country is required.');
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
  const trimmed = normalize(input);
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
}

export async function listHotelsForAdmin(): Promise<AdminHotel[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('hotels')
    .select('id, name, city, country')
    .order('city')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getHotelById(id: string): Promise<AdminHotel | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from('hotels')
    .select('id, name, city, country')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// =====================================================
// Reports — Apple Guideline 1.2 abuse-handling moderation queue.
// Read/update gated by supabase/admin_reports.sql RLS.
// =====================================================

export type ReportStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed';

export type ReportReason =
  | 'harassment'
  | 'sexual'
  | 'spam'
  | 'impersonation'
  | 'underage'
  | 'other';

export interface ReportTarget {
  type: 'user' | 'activity' | 'message';
  /** Human-readable summary for the card. */
  label: string;
  /** Route to drill into for full context, or null if not deep-linkable. */
  href: string | null;
}

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

function formatActivityLabel(
  venue: string,
  hotel: string | null,
  date: string,
): string {
  const parts = [venue, hotel, date].filter((p): p is string => !!p);
  return parts.join(' · ');
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

  type Row = {
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
    reported_user: { id: string; first_name: string } | null;
    reported_activity:
      | { id: string; venue: string; date: string; hotel: { name: string } | null }
      | null;
    reported_message:
      | { id: string; conversation_id: string; content: string }
      | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r): ReportSummary => {
    let target: ReportTarget;
    if (r.reported_user) {
      target = {
        type: 'user',
        label: `@${r.reported_user.first_name}`,
        href: `/user/${r.reported_user.id}`,
      };
    } else if (r.reported_activity) {
      target = {
        type: 'activity',
        label: formatActivityLabel(
          r.reported_activity.venue,
          r.reported_activity.hotel?.name ?? null,
          r.reported_activity.date,
        ),
        href: `/activity/${r.reported_activity.id}`,
      };
    } else if (r.reported_message) {
      const snippet =
        r.reported_message.content.length > 60
          ? r.reported_message.content.slice(0, 60) + '…'
          : r.reported_message.content;
      target = {
        type: 'message',
        label: `"${snippet}"`,
        href: `/messages/${r.reported_message.conversation_id}`,
      };
    } else {
      // Shouldn't happen — the check constraint requires at least one
      // target — but the FK ON DELETE CASCADE could leave a brief
      // window. Render defensively.
      target = { type: 'user', label: '(target removed)', href: null };
    }

    return {
      id: r.id,
      reporterId: r.reporter_id,
      reporterName: r.reporter?.first_name ?? 'Unknown',
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at,
      target,
    };
  });
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

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: 'Harassment or threats',
  sexual: 'Sexual or explicit content',
  spam: 'Spam or solicitation',
  impersonation: 'Impersonation',
  underage: 'Appears to be under 13',
  other: 'Something else',
};
