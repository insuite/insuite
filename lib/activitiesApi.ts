import type { Hotel } from '@/constants/hotels';
import { hotels as STATIC_HOTELS } from '@/constants/hotels';
import { languageMap } from '@/constants/languages';
import {
  PLACEHOLDER_ACTIVITIES,
  type PlaceholderActivity,
  type PlaceholderGuest,
} from '@/constants/placeholderActivities';
import type { VenueKey } from '@/constants/venues';
import type { ActivityDraft } from '@/stores/activityDraftStore';

import { isSupabaseConfigured, supabase } from './supabase';

export interface HotelRequestInput {
  name: string;
  city: string;
  country: string;
  notes?: string;
}

/**
 * Submit a "please add this hotel" request. The owner reviews these in the
 * Supabase dashboard and copies approved entries into the `hotels` table.
 * Throws on failure so the caller can surface it.
 */
export async function submitHotelRequest(input: HotelRequestInput): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    // Demo mode: nothing to write to. Don't error — just no-op.
    return;
  }
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Not signed in');

  const trimmed = {
    name: input.name.trim(),
    city: input.city.trim(),
    country: input.country.trim(),
    notes: input.notes?.trim() || null,
  };
  if (!trimmed.name || !trimmed.city || !trimmed.country) {
    throw new Error('Hotel name, city, and country are required.');
  }

  const { error } = await supabase.from('hotel_requests').insert({
    requester_id: userId,
    name: trimmed.name,
    city: trimmed.city,
    country: trimmed.country,
    notes: trimmed.notes,
  });
  if (error) throw error;
}

/**
 * Fetch the hotels catalog from Supabase. Falls back to the bundled static list
 * in demo mode (no Supabase) or on network failure so Step 1 of activity
 * creation always has something to render.
 */
export async function listHotels(): Promise<Hotel[]> {
  if (!isSupabaseConfigured || !supabase) {
    return STATIC_HOTELS;
  }
  const { data, error } = await supabase
    .from('hotels')
    .select('id, name, city, country')
    .order('city')
    .order('name');
  if (error) {
    console.warn('[hotels] fetch failed', error.message);
    return STATIC_HOTELS;
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    country: row.country,
  }));
}

/**
 * Insert an activity row from the in-progress draft.
 * Throws on failure — caller should surface to the user.
 */
export async function createActivity(draft: ActivityDraft): Promise<string> {
  if (!draft.hotelId || !draft.venue || !draft.date || !draft.timeFrom || !draft.timeTo) {
    throw new Error('Activity draft is incomplete.');
  }

  if (!isSupabaseConfigured || !supabase) {
    // Demo mode — return a fake id so callers can navigate away.
    return `local-${Date.now()}`;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in.');

  const { data, error } = await supabase
    .from('activities')
    .insert({
      host_id: session.user.id,
      hotel_id: draft.hotelId,
      venue: draft.venue,
      date: draft.date,
      time_from: draft.timeFrom,
      time_to: draft.timeTo,
      note: draft.note.trim() || null,
    })
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Insert returned no row.');
  return data.id;
}

// =====================================================
// Activity queries
// =====================================================

interface ActivityRow {
  id: string;
  venue: VenueKey;
  date: string;
  time_from: string;
  time_to: string;
  note: string | null;
  status: string;
  host:
    | {
        id: string;
        first_name: string;
        bio: string | null;
        languages: string[];
        avatar_url: string | null;
      }
    | null;
  hotel:
    | {
        id: string;
        name: string;
        city: string;
        country: string;
      }
    | null;
}

const ACTIVITY_SELECT = `
  id, venue, date, time_from, time_to, note, status,
  host:profiles!activities_host_id_fkey(id, first_name, bio, languages, avatar_url),
  hotel:hotels!activities_hotel_id_fkey(id, name, city, country)
`;

function formatDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function rowToActivity(row: ActivityRow): PlaceholderActivity | null {
  if (!row.host || !row.hotel) return null;
  const langs = (row.host.languages ?? [])
    .map((code) => languageMap[code])
    .filter(Boolean);

  return {
    id: row.id,
    venue: row.venue,
    host: {
      id: row.host.id,
      firstName: row.host.first_name,
      initial: (row.host.first_name[0] ?? '?').toUpperCase(),
      bio: row.host.bio ?? '',
      languages: langs.map((l) => ({
        code: l.code,
        flag: l.flag,
        name: l.name,
      })),
      avatarUri: row.host.avatar_url,
    },
    hotelName: row.hotel.name,
    hotelCity: row.hotel.city,
    dateIso: row.date,
    dateLabel: formatDateLabel(row.date),
    timeFrom: row.time_from.slice(0, 5),
    timeTo: row.time_to.slice(0, 5),
    note: row.note ?? '',
    status: (row.status as 'active' | 'cancelled' | 'completed') ?? 'active',
    spotsTotal: 3,
    spotsTaken: 0,
    joinedGuests: [],
  };
}

/**
 * Active, future activities — for the Discover feed.
 * Pass `excludeUserId` to hide that user's own activities (you can't join your
 * own). Falls back to placeholder data in demo mode (no Supabase).
 */
export async function listActivities(
  excludeUserId?: string,
): Promise<PlaceholderActivity[]> {
  if (!isSupabaseConfigured || !supabase) {
    return PLACEHOLDER_ACTIVITIES;
  }
  const today = new Date().toISOString().slice(0, 10);
  let query = supabase
    .from('activities')
    .select(ACTIVITY_SELECT)
    .eq('status', 'active')
    .gte('date', today);
  if (excludeUserId) {
    query = query.neq('host_id', excludeUserId);
  }
  const { data, error } = await query
    .order('date')
    .order('time_from');

  if (error) {
    console.warn('[activities] list failed', error.message);
    return [];
  }
  return ((data ?? []) as unknown as ActivityRow[])
    .map(rowToActivity)
    .filter((x): x is PlaceholderActivity => x !== null);
}

/**
 * The signed-in user's own activities (any status), most recent first.
 */
export async function listMyActivities(
  userId: string,
): Promise<PlaceholderActivity[]> {
  if (!isSupabaseConfigured || !supabase) {
    return [];
  }
  const { data, error } = await supabase
    .from('activities')
    .select(ACTIVITY_SELECT)
    .eq('host_id', userId)
    .order('date', { ascending: false })
    .order('time_from', { ascending: false });

  if (error) {
    console.warn('[activities] my list failed', error.message);
    return [];
  }
  return ((data ?? []) as unknown as ActivityRow[])
    .map(rowToActivity)
    .filter((x): x is PlaceholderActivity => x !== null);
}

/**
 * Activities the user has joined (status='accepted') or requested (status='pending'),
 * looked up via join_requests. Returns activities sorted soonest first.
 */
async function listJoinedByStatus(
  userId: string,
  status: 'accepted' | 'pending',
): Promise<PlaceholderActivity[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('join_requests')
    .select(
      `activity:activities!join_requests_activity_id_fkey(${ACTIVITY_SELECT})`,
    )
    .eq('requester_id', userId)
    .eq('status', status);

  if (error) {
    console.warn('[activities] joined-by-status failed', error.message);
    return [];
  }

  type JoinRow = { activity: ActivityRow | null };
  return ((data ?? []) as unknown as JoinRow[])
    .map((r) => (r.activity ? rowToActivity(r.activity) : null))
    .filter((x): x is PlaceholderActivity => x !== null)
    .sort((a, b) => (a.dateLabel < b.dateLabel ? -1 : 1));
}

export const listMyJoinedActivities = (userId: string) =>
  listJoinedByStatus(userId, 'accepted');

export const listMyRequestedActivities = (userId: string) =>
  listJoinedByStatus(userId, 'pending');

/**
 * Single activity by id — used by /activity/[id] detail page.
 */
export async function getActivity(id: string): Promise<PlaceholderActivity | null> {
  if (!isSupabaseConfigured || !supabase) {
    return PLACEHOLDER_ACTIVITIES.find((a) => a.id === id) ?? null;
  }
  const { data, error } = await supabase
    .from('activities')
    .select(ACTIVITY_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.warn('[activities] get failed', error.message);
    return null;
  }
  if (!data) return null;
  return rowToActivity(data as unknown as ActivityRow);
}

// =====================================================
// Activity mutations (host-only)
// =====================================================

export interface UpdateActivityPatch {
  date?: string;
  timeFrom?: string;
  timeTo?: string;
  note?: string | null;
}

/**
 * Update editable fields on an activity. RLS only allows the host.
 */
export async function updateActivity(
  id: string,
  patch: UpdateActivityPatch,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const dbPatch: Record<string, unknown> = {};
  if (patch.date !== undefined) dbPatch.date = patch.date;
  if (patch.timeFrom !== undefined) dbPatch.time_from = patch.timeFrom;
  if (patch.timeTo !== undefined) dbPatch.time_to = patch.timeTo;
  if (patch.note !== undefined) {
    dbPatch.note = patch.note && patch.note.length > 0 ? patch.note : null;
  }

  const { error } = await supabase
    .from('activities')
    .update(dbPatch)
    .eq('id', id);
  if (error) throw error;
}

/**
 * Mark an activity as cancelled. Activity disappears from Discover (which
 * filters status='active') but remains visible in My Activities with a
 * cancelled tag, and existing conversations stay open.
 */
export async function cancelActivity(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('activities')
    .update({ status: 'cancelled' })
    .eq('id', id);
  if (error) throw error;
}

// =====================================================
// Join requests
// =====================================================

export type JoinRequestStatus = 'pending' | 'accepted' | 'declined';

export interface MyJoinRequestState {
  exists: boolean;
  status?: JoinRequestStatus;
}

/**
 * Has the current user already requested to join this activity?
 */
export async function getMyJoinRequest(
  activityId: string,
): Promise<MyJoinRequestState> {
  if (!isSupabaseConfigured || !supabase) return { exists: false };
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { exists: false };

  const { data, error } = await supabase
    .from('join_requests')
    .select('status')
    .eq('activity_id', activityId)
    .eq('requester_id', session.user.id)
    .maybeSingle();

  if (error) {
    console.warn('[join_requests] my-state failed', error.message);
    return { exists: false };
  }
  if (!data) return { exists: false };
  return { exists: true, status: data.status as JoinRequestStatus };
}

/**
 * Insert a join request from the current user. Throws on RLS / duplicate.
 */
export async function requestToJoin(activityId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in.');

  const { error } = await supabase.from('join_requests').insert({
    activity_id: activityId,
    requester_id: session.user.id,
  });
  if (error) throw error;
}

/**
 * Accepted-only join requests, with the requester's profile attached.
 * Used by Activity Detail's "Already joined" section.
 */
export async function listJoinedGuests(
  activityId: string,
): Promise<PlaceholderGuest[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('join_requests')
    .select(
      `requester:profiles!join_requests_requester_id_fkey(id, first_name, avatar_url)`,
    )
    .eq('activity_id', activityId)
    .eq('status', 'accepted');

  if (error) {
    console.warn('[join_requests] joined-guests failed', error.message);
    return [];
  }

  type Row = { requester: { id: string; first_name: string; avatar_url: string | null } | null };
  return ((data ?? []) as unknown as Row[])
    .map((row) => {
      if (!row.requester) return null;
      return {
        id: row.requester.id,
        firstName: row.requester.first_name,
        initial: (row.requester.first_name[0] ?? '?').toUpperCase(),
        avatarUri: row.requester.avatar_url,
      } as PlaceholderGuest;
    })
    .filter((x): x is PlaceholderGuest => x !== null);
}
