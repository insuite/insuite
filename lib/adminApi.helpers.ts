/**
 * Pure helpers for adminApi — no Supabase, no I/O.
 *
 * Split out from adminApi.ts so they can be unit-tested without
 * mocking the Supabase client. The wrapper functions in adminApi.ts
 * compose these with the live client.
 */

// =====================================================
// Hotel input normalization + validation
// =====================================================

export interface HotelInput {
  name: string;
  city: string;
  country: string;
}

export function normalizeHotelInput(input: HotelInput): HotelInput {
  return {
    name: input.name.trim(),
    city: input.city.trim(),
    country: input.country.trim(),
  };
}

export function assertHotelInput(t: HotelInput): void {
  if (t.name.length < 2) throw new Error('Hotel name is required.');
  if (t.city.length < 2) throw new Error('City is required.');
  if (t.country.length < 2) throw new Error('Country is required.');
}

// =====================================================
// Report target builder
// =====================================================

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

/**
 * Shape produced by the Supabase joined select in listReports. Kept
 * here (in plain TS, no Supabase types) so the target builder is
 * fully unit-testable.
 */
export interface ReportTargetSource {
  reported_user: { id: string; first_name: string } | null;
  reported_activity:
    | { id: string; venue: string; date: string; hotel: { name: string } | null }
    | null;
  reported_message:
    | { id: string; conversation_id: string; content: string }
    | null;
}

/** How many chars of a reported message body we show before truncating. */
const MESSAGE_SNIPPET_LIMIT = 60;

export function formatActivityLabel(
  venue: string,
  hotel: string | null,
  date: string,
): string {
  const parts = [venue, hotel, date].filter((p): p is string => !!p);
  return parts.join(' · ');
}

export function buildReportTarget(row: ReportTargetSource): ReportTarget {
  if (row.reported_user) {
    return {
      type: 'user',
      label: `@${row.reported_user.first_name}`,
      href: `/user/${row.reported_user.id}`,
    };
  }
  if (row.reported_activity) {
    return {
      type: 'activity',
      label: formatActivityLabel(
        row.reported_activity.venue,
        row.reported_activity.hotel?.name ?? null,
        row.reported_activity.date,
      ),
      href: `/activity/${row.reported_activity.id}`,
    };
  }
  if (row.reported_message) {
    const c = row.reported_message.content;
    const snippet =
      c.length > MESSAGE_SNIPPET_LIMIT
        ? c.slice(0, MESSAGE_SNIPPET_LIMIT) + '…'
        : c;
    // Admin-only chat viewer — the consumer /messages/[id] screen is
    // RLS-scoped to participants and would render "Conversation not
    // found" for an admin who isn't in the chat. The reported message
    // id rides along so the admin screen can highlight / scroll to it.
    return {
      type: 'message',
      label: `"${snippet}"`,
      href: `/admin/conversations/${row.reported_message.conversation_id}?reportedMessageId=${row.reported_message.id}`,
    };
  }
  // The check constraint on reports requires at least one target, but
  // ON DELETE CASCADE on each FK can briefly leave a fully-null row
  // visible. Render defensively.
  return { type: 'user', label: '(target removed)', href: null };
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: 'Harassment or threats',
  sexual: 'Sexual or explicit content',
  spam: 'Spam or solicitation',
  impersonation: 'Impersonation',
  underage: 'Appears to be under 13',
  other: 'Something else',
};
