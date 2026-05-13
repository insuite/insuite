import { describe, expect, it } from 'vitest';

import {
  assertHotelInput,
  buildReportTarget,
  formatActivityLabel,
  normalizeHotelInput,
  REPORT_REASON_LABELS,
  type ReportReason,
  type ReportTargetSource,
} from '@/lib/adminApi.helpers';

// Convenience: produce a ReportTargetSource with all three target slots
// nulled out, so each test only needs to set the one it cares about.
const emptyTargets = (): ReportTargetSource => ({
  reported_user: null,
  reported_activity: null,
  reported_message: null,
});

describe('normalizeHotelInput', () => {
  it('trims leading and trailing whitespace on each field', () => {
    expect(
      normalizeHotelInput({
        name: '  Park Hyatt Tokyo  ',
        city: '\tTokyo\n',
        country: ' Japan ',
      }),
    ).toEqual({ name: 'Park Hyatt Tokyo', city: 'Tokyo', country: 'Japan' });
  });

  it('leaves already-clean input untouched', () => {
    const input = { name: 'Aman Kyoto', city: 'Kyoto', country: 'Japan' };
    expect(normalizeHotelInput(input)).toEqual(input);
  });

  it('preserves internal whitespace', () => {
    expect(
      normalizeHotelInput({
        name: '  The   Peninsula   Tokyo  ',
        city: 'Tokyo',
        country: 'Japan',
      }).name,
    ).toBe('The   Peninsula   Tokyo');
  });
});

describe('assertHotelInput', () => {
  it('accepts a fully-populated input', () => {
    expect(() =>
      assertHotelInput({ name: 'Aman Tokyo', city: 'Tokyo', country: 'Japan' }),
    ).not.toThrow();
  });

  it('throws when name is too short', () => {
    expect(() =>
      assertHotelInput({ name: 'A', city: 'Tokyo', country: 'Japan' }),
    ).toThrow(/name/i);
  });

  it('throws when city is too short', () => {
    expect(() =>
      assertHotelInput({ name: 'Aman Tokyo', city: '', country: 'Japan' }),
    ).toThrow(/city/i);
  });

  it('throws when country is too short', () => {
    expect(() =>
      assertHotelInput({ name: 'Aman Tokyo', city: 'Tokyo', country: 'J' }),
    ).toThrow(/country/i);
  });
});

describe('formatActivityLabel', () => {
  it('joins venue / hotel / date with the gold-separator dot', () => {
    expect(
      formatActivityLabel('pool', 'Mandarin Oriental Taipei', '2026-05-13'),
    ).toBe('pool · Mandarin Oriental Taipei · 2026-05-13');
  });

  it('skips a null hotel without leaving a stray separator', () => {
    expect(formatActivityLabel('pool', null, '2026-05-13')).toBe(
      'pool · 2026-05-13',
    );
  });

  it('skips an empty hotel string the same as null', () => {
    expect(formatActivityLabel('pool', '', '2026-05-13')).toBe(
      'pool · 2026-05-13',
    );
  });
});

describe('buildReportTarget', () => {
  it('user target → @firstname label + /user/[id] href', () => {
    const target = buildReportTarget({
      ...emptyTargets(),
      reported_user: { id: 'u_42', first_name: 'Yuko' },
    });
    expect(target).toEqual({
      type: 'user',
      label: '@Yuko',
      href: '/user/u_42',
    });
  });

  it('activity target → joined label + /activity/[id] href', () => {
    const target = buildReportTarget({
      ...emptyTargets(),
      reported_activity: {
        id: 'a_1',
        venue: 'pool',
        date: '2026-05-13',
        hotel: { name: 'Mandarin Oriental Taipei' },
      },
    });
    expect(target).toEqual({
      type: 'activity',
      label: 'pool · Mandarin Oriental Taipei · 2026-05-13',
      href: '/activity/a_1',
    });
  });

  it('activity target tolerates a missing hotel join', () => {
    const target = buildReportTarget({
      ...emptyTargets(),
      reported_activity: {
        id: 'a_1',
        venue: 'pool',
        date: '2026-05-13',
        hotel: null,
      },
    });
    expect(target.label).toBe('pool · 2026-05-13');
  });

  it('message target → quoted snippet + admin chat href with reportedMessageId', () => {
    const target = buildReportTarget({
      ...emptyTargets(),
      reported_message: {
        id: 'm_9',
        conversation_id: 'c_3',
        content: 'are you free for dinner?',
      },
    });
    expect(target).toEqual({
      type: 'message',
      label: '"are you free for dinner?"',
      href: '/admin/conversations/c_3?reportedMessageId=m_9',
    });
  });

  it('message snippet truncates over 60 chars with an ellipsis', () => {
    const longContent =
      'a'.repeat(70) + ' tail that should not appear in the snippet';
    const target = buildReportTarget({
      ...emptyTargets(),
      reported_message: {
        id: 'm_9',
        conversation_id: 'c_3',
        content: longContent,
      },
    });
    expect(target.label).toBe(`"${'a'.repeat(60)}…"`);
    expect(target.label).not.toContain('tail');
  });

  it('message snippet leaves exactly-60-char content unchanged (no ellipsis)', () => {
    const exactly60 = 'a'.repeat(60);
    const target = buildReportTarget({
      ...emptyTargets(),
      reported_message: {
        id: 'm_9',
        conversation_id: 'c_3',
        content: exactly60,
      },
    });
    expect(target.label).toBe(`"${exactly60}"`);
  });

  it('user target wins when multiple targets are present', () => {
    // Schema allows only one in practice, but the builder picks user
    // first so a row with stale joins doesn't render the wrong thing.
    const target = buildReportTarget({
      reported_user: { id: 'u_1', first_name: 'A' },
      reported_activity: {
        id: 'a_1',
        venue: 'pool',
        date: '2026-05-13',
        hotel: { name: 'Hotel' },
      },
      reported_message: {
        id: 'm_1',
        conversation_id: 'c_1',
        content: 'hi',
      },
    });
    expect(target.type).toBe('user');
  });

  it('falls back to "(target removed)" when all three slots are null', () => {
    expect(buildReportTarget(emptyTargets())).toEqual({
      type: 'user',
      label: '(target removed)',
      href: null,
    });
  });
});

describe('REPORT_REASON_LABELS', () => {
  it('covers every ReportReason value', () => {
    const expectedKeys: ReportReason[] = [
      'harassment',
      'sexual',
      'spam',
      'impersonation',
      'underage',
      'other',
    ];
    for (const k of expectedKeys) {
      expect(REPORT_REASON_LABELS[k]).toBeTruthy();
    }
    expect(Object.keys(REPORT_REASON_LABELS).sort()).toEqual(
      [...expectedKeys].sort(),
    );
  });
});
