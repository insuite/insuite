import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminGate } from '@/components/admin/AdminGate';
import { colors, radius, spacing, typography } from '@/constants/colors';
import {
  dismissReport,
  listReports,
  markReportActioned,
  REPORT_REASON_LABELS,
  type ReportStatus,
  type ReportSummary,
} from '@/lib/adminApi';

/**
 * Admin reports queue.
 *
 * Mirrors the hotel-requests screen pattern (tabs + per-card actions),
 * tuned for the moderation case:
 *   - 3 tabs only (Pending / Actioned / Dismissed). The 'reviewed'
 *     status exists in the schema but isn't surfaced — the two
 *     meaningful terminal states are "I took action" and "this isn't a
 *     violation". A "saw it, parked" state would be nice but isn't
 *     worth a 4th tab in v1.
 *   - Target label is tappable; deep-links into /user/[id], /activity/
 *     [id], or /messages/[conv-id] for context. Admin uses Dashboard /
 *     other admin screens to actually act (block, cancel, delete) —
 *     this screen just records the audit trail of the decision.
 */

const TABS: { key: ReportStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'actioned', label: 'Actioned' },
  { key: 'dismissed', label: 'Dismissed' },
];

const TARGET_ICON: Record<ReportSummary['target']['type'], string> = {
  user: 'person-outline',
  activity: 'calendar-outline',
  message: 'chatbubble-outline',
};

export default function AdminReports() {
  const router = useRouter();
  const [tab, setTab] = useState<ReportStatus>('pending');
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback((status: ReportStatus) => {
    let cancelled = false;
    setLoading(true);
    listReports(status)
      .then((list) => {
        if (cancelled) return;
        setReports(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      return refresh(tab);
    }, [refresh, tab]),
  );

  const onDismiss = (r: ReportSummary) => {
    Alert.alert(
      'Dismiss this report?',
      `Mark "${REPORT_REASON_LABELS[r.reason]}" against ${r.target.label} as not a violation. The reporter isn't notified.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          onPress: async () => {
            try {
              await dismissReport(r.id);
              setReports((prev) => prev.filter((x) => x.id !== r.id));
            } catch (err: any) {
              Alert.alert(
                'Could not dismiss',
                err?.message ?? 'Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  const onMarkActioned = (r: ReportSummary) => {
    Alert.alert(
      'Mark actioned?',
      "Record that you've taken corrective action on this report. The actual action (block, cancel activity, etc.) happens elsewhere — this flag is the audit trail.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark actioned',
          onPress: async () => {
            try {
              await markReportActioned(r.id);
              setReports((prev) => prev.filter((x) => x.id !== r.id));
            } catch (err: any) {
              Alert.alert(
                'Could not update',
                err?.message ?? 'Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  const emptyMessage =
    tab === 'pending'
      ? 'No pending reports — all clear.'
      : tab === 'actioned'
        ? 'No actioned reports yet.'
        : 'No dismissed reports yet.';

  return (
    <AdminGate>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.navBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.navBtn}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.text.primary}
            />
          </Pressable>
          <Text style={styles.navTitle}>Reports</Text>
          <View style={styles.navBtn} />
        </View>

        <View style={styles.tabBar}>
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={({ pressed }) => [
                  styles.tab,
                  active && styles.tabActive,
                  pressed && !active && { opacity: 0.6 },
                ]}
              >
                <Text
                  style={[styles.tabLabel, active && styles.tabLabelActive]}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent.gold} />
          </View>
        ) : (
          <FlatList
            data={reports}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.reasonRow}>
                  <Text style={styles.reasonText}>
                    {REPORT_REASON_LABELS[item.reason]}
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    item.target.href &&
                    router.push(item.target.href as never)
                  }
                  disabled={!item.target.href}
                  style={({ pressed }) => [
                    styles.targetRow,
                    pressed && item.target.href && { opacity: 0.6 },
                  ]}
                >
                  <Ionicons
                    name={TARGET_ICON[item.target.type] as never}
                    size={16}
                    color={colors.accent.gold}
                  />
                  <Text style={styles.targetText} numberOfLines={2}>
                    {item.target.label}
                  </Text>
                  {item.target.href && (
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={colors.text.ghost}
                    />
                  )}
                </Pressable>

                {item.details ? (
                  <Text style={styles.cardDetails}>"{item.details}"</Text>
                ) : null}

                <Text style={styles.cardMeta}>
                  From {item.reporterName} ·{' '}
                  {new Date(item.createdAt).toLocaleDateString()}
                  {item.status !== 'pending' && item.reviewedAt
                    ? ` · ${item.status} ${new Date(item.reviewedAt).toLocaleDateString()}`
                    : ''}
                </Text>

                {item.status === 'pending' && (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => onDismiss(item)}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.dismissBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={styles.dismissText}>Dismiss</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => onMarkActioned(item)}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.actionedBtn,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={styles.actionedText}>Mark actioned</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons
                  name={
                    tab === 'pending'
                      ? 'shield-checkmark-outline'
                      : tab === 'actioned'
                        ? 'archive-outline'
                        : 'close-circle-outline'
                  }
                  size={32}
                  color={colors.text.faint}
                />
                <Text style={styles.emptyText}>{emptyMessage}</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </AdminGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { ...typography.h3, color: colors.text.primary },
  tabBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  tab: {
    flex: 1,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    borderColor: colors.accent.gold,
    backgroundColor: colors.border.active,
  },
  tabLabel: { ...typography.small, color: colors.text.secondary },
  tabLabelActive: { color: colors.text.primary, fontWeight: '500' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reasonText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.secondary,
  },
  targetText: {
    ...typography.small,
    color: colors.text.secondary,
    flex: 1,
  },
  cardDetails: {
    ...typography.small,
    color: colors.text.muted,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  cardMeta: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dismissBtn: {
    borderColor: colors.border.default,
    backgroundColor: 'transparent',
  },
  dismissText: {
    ...typography.body,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  actionedBtn: {
    borderColor: colors.accent.red,
    backgroundColor: colors.accent.red,
  },
  actionedText: {
    ...typography.body,
    color: colors.bg.primary,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: { ...typography.body, color: colors.text.muted },
});
