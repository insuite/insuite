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
