// InSuite — push-notification dispatcher.
//
// Triggered by Supabase Database Webhooks on:
//   • messages INSERT          → notify the OTHER conversation participant
//   • join_requests INSERT     → notify the host of the activity
//   • join_requests UPDATE     → if status changed to 'accepted', notify the
//                                 requester they're going
//
// Sends via Expo Push API (https://exp.host/--/api/v2/push/send), which routes
// to APNs (iOS) using the .p8 key you uploaded to EAS.
//
// Deploy:  supabase functions deploy send-push --no-verify-jwt
// Secret:  supabase secrets set WEBHOOK_SECRET=<long random string>
// Webhook: configure 3 hooks in Supabase Dashboard → Database → Webhooks
//          (each posts to /functions/v1/send-push with Authorization header
//          "Bearer <WEBHOOK_SECRET>")

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  priority?: 'default' | 'normal' | 'high';
}

async function sendExpoPush(messages: ExpoMessage[]): Promise<void> {
  if (messages.length === 0) return;
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  });
  const text = await res.text();
  console.log('[expo push]', res.status, text);
}

async function getProfile(
  userId: string,
): Promise<{ first_name: string; expo_push_token: string | null } | null> {
  const { data } = await supabase
    .from('profiles')
    .select('first_name, expo_push_token')
    .eq('id', userId)
    .maybeSingle();
  return data as any;
}

const VENUE_LABEL: Record<string, string> = {
  pool: 'Pool',
  gym: 'Gym',
  lounge: 'Lounge',
  breakfast: 'Breakfast',
  spa: 'Spa',
  dinner: 'Dinner',
};

// =====================================================
// Handlers
// =====================================================

async function handleNewMessage(record: any): Promise<void> {
  const { data: conv } = await supabase
    .from('conversations')
    .select('participant_a, participant_b')
    .eq('id', record.conversation_id)
    .maybeSingle();
  if (!conv) return;

  const recipientId =
    record.sender_id === conv.participant_a
      ? conv.participant_b
      : conv.participant_a;

  const [sender, recipient] = await Promise.all([
    getProfile(record.sender_id),
    getProfile(recipientId),
  ]);
  if (!recipient?.expo_push_token) return;

  await sendExpoPush([
    {
      to: recipient.expo_push_token,
      title: sender?.first_name ?? 'Someone',
      body: String(record.content ?? '').slice(0, 200),
      data: {
        type: 'message',
        conversationId: record.conversation_id,
      },
      sound: 'default',
      priority: 'high',
    },
  ]);
}

async function handleNewJoinRequest(record: any): Promise<void> {
  const { data: act } = await supabase
    .from('activities')
    .select('host_id, venue')
    .eq('id', record.activity_id)
    .maybeSingle();
  if (!act) return;

  const [requester, host] = await Promise.all([
    getProfile(record.requester_id),
    getProfile(act.host_id),
  ]);
  if (!host?.expo_push_token) return;

  const venueLabel = VENUE_LABEL[act.venue as string] ?? 'meet-up';
  await sendExpoPush([
    {
      to: host.expo_push_token,
      title: 'New request',
      body: `${requester?.first_name ?? 'Someone'} wants to join your ${venueLabel}.`,
      data: { type: 'join_request' },
      sound: 'default',
      priority: 'high',
    },
  ]);
}

async function handleRequestAccepted(record: any): Promise<void> {
  const { data: act } = await supabase
    .from('activities')
    .select('host_id, venue')
    .eq('id', record.activity_id)
    .maybeSingle();
  if (!act) return;

  // The trigger creates a conversation on accept. Find it so we can deep-link.
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('activity_id', record.activity_id)
    .or(
      `participant_a.eq.${record.requester_id},participant_b.eq.${record.requester_id}`,
    )
    .maybeSingle();

  const [requester, host] = await Promise.all([
    getProfile(record.requester_id),
    getProfile(act.host_id),
  ]);
  if (!requester?.expo_push_token) return;

  const venueLabel = VENUE_LABEL[act.venue as string] ?? 'meet-up';
  await sendExpoPush([
    {
      to: requester.expo_push_token,
      title: `${host?.first_name ?? 'Host'} accepted`,
      body: `You're going to the ${venueLabel}. Say hi 👋`,
      data: {
        type: 'request_accepted',
        conversationId: conv?.id,
      },
      sound: 'default',
      priority: 'high',
    },
  ]);
}

// =====================================================
// HTTP entry
// =====================================================

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Optional shared-secret check (set WEBHOOK_SECRET via `supabase secrets set`)
  if (WEBHOOK_SECRET) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${WEBHOOK_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  console.log(
    '[webhook]',
    payload.type,
    payload.table,
    JSON.stringify(payload.record ?? {}).slice(0, 100),
  );

  try {
    if (payload.table === 'messages' && payload.type === 'INSERT') {
      await handleNewMessage(payload.record);
    } else if (
      payload.table === 'join_requests' &&
      payload.type === 'INSERT'
    ) {
      await handleNewJoinRequest(payload.record);
    } else if (
      payload.table === 'join_requests' &&
      payload.type === 'UPDATE' &&
      payload.record?.status === 'accepted' &&
      payload.old_record?.status !== 'accepted'
    ) {
      await handleRequestAccepted(payload.record);
    }
  } catch (err) {
    // Log but always return 200 — we don't want Supabase to retry-storm us.
    console.error('[handler error]', err);
  }

  return new Response('OK', { status: 200 });
});
