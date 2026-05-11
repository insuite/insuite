import { venueMap, type VenueKey } from '@/constants/venues';

import { isSupabaseConfigured, supabase } from './supabase';

// =====================================================
// Types
// =====================================================

export interface PartyLite {
  id: string;
  firstName: string;
  initial: string;
  avatarUri: string | null;
}

export interface ConversationSummary {
  id: string;
  activityId: string;
  other: PartyLite;
  venueContext: string;
  lastMessage: string | null;
  lastTime: string | null;
  unread: boolean;
}

export interface IncomingRequest {
  id: string;
  activityId: string;
  requester: PartyLite;
  venueContext: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  fromMe: boolean;
  text: string;
  createdAt: string;
}

export interface ChatContext {
  conversationId: string;
  activityId: string;
  other: PartyLite;
  venueContext: string;
}

// =====================================================
// Helpers
// =====================================================

function partyFromProfile(
  profile: { id: string; first_name: string; avatar_url: string | null },
): PartyLite {
  return {
    id: profile.id,
    firstName: profile.first_name,
    initial: (profile.first_name[0] ?? '?').toUpperCase(),
    avatarUri: profile.avatar_url,
  };
}

function shortDate(iso: string): string {
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

function venueContext(activity: {
  venue: VenueKey;
  date: string;
  time_from: string;
  time_to: string;
}): string {
  const v = venueMap[activity.venue];
  return `${v.label} · ${shortDate(activity.date)} · ${activity.time_from.slice(0, 5)}–${activity.time_to.slice(0, 5)}`;
}

export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const mins = Math.floor((now - t) / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

// =====================================================
// Conversations
// =====================================================

interface ConversationRow {
  id: string;
  activity_id: string;
  participant_a: string;
  participant_b: string;
  a: { id: string; first_name: string; avatar_url: string | null } | null;
  b: { id: string; first_name: string; avatar_url: string | null } | null;
  activity: {
    venue: VenueKey;
    date: string;
    time_from: string;
    time_to: string;
  } | null;
}

const CONVERSATION_SELECT = `
  id, activity_id, participant_a, participant_b,
  a:profiles!conversations_participant_a_fkey(id, first_name, avatar_url),
  b:profiles!conversations_participant_b_fkey(id, first_name, avatar_url),
  activity:activities!conversations_activity_id_fkey(venue, date, time_from, time_to)
`;

/**
 * List the signed-in user's conversations with the OTHER party + activity
 * context + last-message preview. Sorted by most recent activity.
 */
export async function listConversations(
  userId: string,
): Promise<ConversationSummary[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`);

  if (error) throw error;

  const rows = (data ?? []) as unknown as ConversationRow[];
  if (rows.length === 0) return [];

  const convIds = rows.map((c) => c.id);

  // Two batched queries instead of N+1: one for all read timestamps, one RPC
  // for the latest message per conversation (DISTINCT ON server-side).
  const [readsResult, latestResult] = await Promise.all([
    supabase
      .from('conversation_reads')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId),
    supabase.rpc('get_conversation_latest_messages', { conv_ids: convIds }),
  ]);

  const readMap = new Map<string, string>();
  for (const r of (readsResult.data ?? []) as {
    conversation_id: string;
    last_read_at: string;
  }[]) {
    readMap.set(r.conversation_id, r.last_read_at);
  }

  const lastMap = new Map<
    string,
    { content: string; created_at: string; sender_id: string }
  >();
  for (const m of (latestResult.data ?? []) as {
    conversation_id: string;
    content: string;
    created_at: string;
    sender_id: string;
  }[]) {
    lastMap.set(m.conversation_id, m);
  }

  const summaries: ConversationSummary[] = [];
  for (const c of rows) {
    if (!c.activity) continue;
    const otherProfile = c.participant_a === userId ? c.b : c.a;
    if (!otherProfile) continue;

    const last = lastMap.get(c.id);
    const lastReadAt = readMap.get(c.id);
    const unread =
      !!last &&
      last.sender_id !== userId &&
      (!lastReadAt || last.created_at > lastReadAt);

    summaries.push({
      id: c.id,
      activityId: c.activity_id,
      other: partyFromProfile(otherProfile),
      venueContext: venueContext(c.activity),
      lastMessage: last?.content ?? null,
      lastTime: last?.created_at ?? null,
      unread,
    });
  }

  return summaries.sort((a, b) => {
    const ta = a.lastTime ? new Date(a.lastTime).getTime() : 0;
    const tb = b.lastTime ? new Date(b.lastTime).getTime() : 0;
    return tb - ta;
  });
}

/**
 * Mark a conversation as read for the current user. Upserts last_read_at=now()
 * so the Messages list and tab badge can recompute unread state on next load.
 */
export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  const { error } = await supabase.from('conversation_reads').upsert({
    conversation_id: conversationId,
    user_id: session.user.id,
    last_read_at: new Date().toISOString(),
  });
  if (error) {
    console.warn('[messages] markConversationRead failed', error.message);
  }
}

// =====================================================
// Incoming pending requests (where I'm the host)
// =====================================================

interface RequestRow {
  id: string;
  activity_id: string;
  created_at: string;
  requester: { id: string; first_name: string; avatar_url: string | null } | null;
  activity: {
    host_id: string;
    venue: VenueKey;
    date: string;
    time_from: string;
    time_to: string;
  } | null;
}

const REQUEST_SELECT = `
  id, activity_id, created_at,
  requester:profiles!join_requests_requester_id_fkey(id, first_name, avatar_url),
  activity:activities!join_requests_activity_id_fkey(host_id, venue, date, time_from, time_to)
`;

/**
 * Pending join requests for activities I host. RLS already returns only rows
 * I'm allowed to see (host or requester); JS filter to host-only.
 */
export async function listIncomingRequests(
  userId: string,
): Promise<IncomingRequest[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('join_requests')
    .select(REQUEST_SELECT)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as RequestRow[];
  return rows
    .map((r) => {
      if (!r.activity || !r.requester) return null;
      if (r.activity.host_id !== userId) return null;
      return {
        id: r.id,
        activityId: r.activity_id,
        requester: partyFromProfile(r.requester),
        venueContext: venueContext(r.activity),
        createdAt: r.created_at,
      } as IncomingRequest;
    })
    .filter((x): x is IncomingRequest => x !== null);
}

export async function acceptRequest(requestId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('join_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId);
  if (error) throw error;
}

export async function declineRequest(requestId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('join_requests')
    .update({ status: 'declined' })
    .eq('id', requestId);
  if (error) throw error;
}

// =====================================================
// Chat thread
// =====================================================

export async function getChatContext(
  conversationId: string,
  userId: string,
): Promise<ChatContext | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('id', conversationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const c = data as unknown as ConversationRow;
  if (!c.activity) return null;

  const otherProfile = c.participant_a === userId ? c.b : c.a;
  if (!otherProfile) return null;

  return {
    conversationId: c.id,
    activityId: c.activity_id,
    other: partyFromProfile(otherProfile),
    venueContext: venueContext(c.activity),
  };
}

export async function listMessages(
  conversationId: string,
  userId: string,
): Promise<ChatMessage[]> {
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
    fromMe: m.sender_id === userId,
    text: m.content,
    createdAt: m.created_at,
  }));
}

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const trimmed = content.trim();
  if (!trimmed) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in.');

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: session.user.id,
    content: trimmed,
  });
  if (error) throw error;
}

interface RawMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  conversation_id: string;
}

/**
 * Subscribe to ANY inbox-affecting event for the current user — new chat
 * messages (RLS already filters to my conversations) and join_requests
 * inserts/updates (RLS filters to where I'm host or requester). Used by the
 * tab layout to keep the badge live without needing the Messages tab to be
 * focused.
 */
export function subscribeToInbox(
  userId: string,
  onUpdate: () => void,
): () => void {
  if (!isSupabaseConfigured || !supabase) return () => {};
  // Per-call unique topic — same reason as subscribeToMessages. Tapping a
  // push notification can fast-remount the tab layout while the previous
  // subscription is still in flight; supabase-js caches by topic and would
  // hand back the already-subscribed channel, then throw because postgres
  // listeners can't be attached after `.subscribe()`.
  const topic = `inbox:${userId}:${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const channel = supabase
    .channel(topic)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      () => onUpdate(),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'join_requests' },
      () => onUpdate(),
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'join_requests' },
      () => onUpdate(),
    )
    .subscribe();

  return () => {
    void supabase!.removeChannel(channel);
  };
}

/**
 * Subscribe to new messages in a conversation. Returns an unsubscribe fn.
 */
export function subscribeToMessages(
  conversationId: string,
  userId: string,
  onNew: (msg: ChatMessage) => void,
): () => void {
  if (!isSupabaseConfigured || !supabase) return () => {};
  // Use a unique topic per call rather than `conv:${conversationId}`.
  // Supabase JS caches channels by topic, so two fast remounts of the
  // chat thread (e.g. tapping a message push that re-opens the same
  // thread) would both grab the same cached channel — but the second
  // call would try to attach a `postgres_changes` listener after
  // `.subscribe()` had already fired on the first, which throws.
  // A unique topic gives each mount its own fresh channel; cleanup
  // removes it by reference and the old one drops naturally.
  const topic = `conv:${conversationId}:${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const channel = supabase
    .channel(topic)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const m = payload.new as RawMessage;
        onNew({
          id: m.id,
          senderId: m.sender_id,
          fromMe: m.sender_id === userId,
          text: m.content,
          createdAt: m.created_at,
        });
      },
    )
    .subscribe();

  return () => {
    void supabase!.removeChannel(channel);
  };
}
