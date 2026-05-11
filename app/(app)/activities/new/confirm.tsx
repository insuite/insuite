import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/constants/colors';
import { venueMap } from '@/constants/venues';
import { createActivity } from '@/lib/activitiesApi';
import { canPostActivity } from '@/lib/passesApi';
import { activityDraft, useActivityDraft } from '@/stores/activityDraftStore';
import { useAuth } from '@/stores/authStore';

type GateReason = 'unlimited' | 'first_free' | 'has_pass' | 'needs_pass';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function ConfirmStep() {
  const router = useRouter();
  const draft = useActivityDraft();
  const { user } = useAuth();
  const [publishing, setPublishing] = useState(false);
  const [gateReason, setGateReason] = useState<GateReason | null>(null);
  const [passDays, setPassDays] = useState<number | null>(null);

  const venue = draft.venue ? venueMap[draft.venue] : null;

  // Tell the user *which* permission lane they're on (first-free, active
  // pass, unlimited godmode) so the perk line below isn't a flat lie when
  // they've already paid for a Pass.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    canPostActivity(user.id)
      .then((gate) => {
        if (cancelled) return;
        setGateReason(gate.reason);
        setPassDays(gate.activePass?.daysRemaining ?? null);
      })
      .catch(() => {
        // Non-fatal — leave the perk hidden if we can't determine the lane.
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const perkText: string | null = (() => {
    switch (gateReason) {
      case 'first_free':
        return 'Your first post is on the house.';
      case 'has_pass':
        return passDays != null
          ? `Posting with your active Pass · ${passDays}d left.`
          : 'Posting with your active Pass.';
      case 'unlimited':
        return 'Unlimited posting on this account.';
      case 'needs_pass':
      case null:
      default:
        return null;
    }
  })();

  const publish = async () => {
    setPublishing(true);
    try {
      const newId = await createActivity(draft);
      activityDraft.reset();
      // Land on the activity's detail page rather than the list — the user
      // just put work into composing this; surfacing it directly lets them
      // share / edit / verify what they published.
      router.replace(`/activity/${newId}`);
    } catch (err: any) {
      Alert.alert('Could not publish', err?.message ?? 'Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text.muted} />
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
        <Text style={styles.step}>4 / 4</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={styles.title}>Ready to{'\n'}publish?</Text>
          <Text style={styles.subtitle}>
            Review below. You can still edit later.
          </Text>
        </View>

        <View style={styles.card}>
          <SummaryRow
            icon="business-outline"
            label="Hotel"
            value={draft.hotelName ?? '—'}
            sub={draft.hotelCity ?? undefined}
            onEdit={() => router.push('/activities/new/hotel')}
          />
          <Divider />
          <SummaryRow
            icon={(venue?.icon as any) ?? 'help-outline'}
            label="Venue"
            value={venue?.label ?? '—'}
            sub={venue?.description}
            onEdit={() => router.push('/activities/new/venue')}
          />
          <Divider />
          <SummaryRow
            icon="calendar-outline"
            label="When"
            value={formatDate(draft.date)}
            sub={
              draft.timeFrom && draft.timeTo
                ? `${draft.timeFrom} – ${draft.timeTo}`
                : undefined
            }
            onEdit={() => router.push('/activities/new/datetime')}
          />
          {draft.note.length > 0 && (
            <>
              <Divider />
              <SummaryRow
                icon="chatbox-outline"
                label="Note"
                value={draft.note}
                multiline
                onEdit={() => router.push('/activities/new/datetime')}
              />
            </>
          )}
        </View>

        {perkText && (
          <View style={styles.perkCard}>
            <Ionicons
              name="gift-outline"
              size={18}
              color={colors.accent.gold}
            />
            <Text style={styles.perkText}>{perkText}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={publish}
          disabled={publishing}
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && !publishing && styles.primaryBtnPressed,
          ]}
        >
          {publishing ? (
            <ActivityIndicator color={colors.accent.goldDark} />
          ) : (
            <Text style={styles.primaryBtnText}>Publish</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function SummaryRow({
  icon,
  label,
  value,
  sub,
  multiline,
  onEdit,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  multiline?: boolean;
  onEdit?: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.accent.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text
          style={styles.rowValue}
          numberOfLines={multiline ? 0 : 1}
        >
          {value}
        </Text>
        {sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {onEdit && (
        <Pressable onPress={onEdit} hitSlop={8}>
          <Text style={styles.editLink}>Edit</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border.subtle,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent.gold,
  },
  step: {
    ...typography.tiny,
    color: colors.text.muted,
    letterSpacing: 1.5,
  },
  intro: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  title: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '300',
    letterSpacing: 0.5,
    lineHeight: 40,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.muted,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
    padding: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowLabel: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 2,
    marginBottom: 2,
  },
  rowValue: {
    ...typography.h3,
    color: colors.text.primary,
    lineHeight: 22,
  },
  rowSub: {
    ...typography.small,
    color: colors.text.muted,
    marginTop: 2,
  },
  editLink: {
    ...typography.small,
    color: colors.accent.gold,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing.md,
  },
  perkCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  perkText: {
    ...typography.small,
    color: colors.text.secondary,
  },
  footer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  primaryBtn: {
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: {
    opacity: 0.85,
  },
  primaryBtnText: {
    color: colors.accent.goldDark,
    fontSize: 17,
    fontWeight: '600',
  },
});
