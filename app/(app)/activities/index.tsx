import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { colors, radius, spacing, typography } from '@/constants/colors';
import { type PlaceholderActivity } from '@/constants/placeholderActivities';
import { venueMap } from '@/constants/venues';
import {
  listMyActivities,
  listMyJoinedActivities,
  listMyRequestedActivities,
} from '@/lib/activitiesApi';
import { canPostActivity } from '@/lib/passesApi';
import { activityDraft } from '@/stores/activityDraftStore';
import { useAuth } from '@/stores/authStore';

export default function ActivitiesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [hosting, setHosting] = useState<PlaceholderActivity[]>([]);
  const [going, setGoing] = useState<PlaceholderActivity[]>([]);
  const [requested, setRequested] = useState<PlaceholderActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // User-initiated refresh — no race protection needed.
  const load = useCallback(async () => {
    if (!user) {
      setHosting([]);
      setGoing([]);
      setRequested([]);
      setLoading(false);
      return;
    }
    const [h, g, r] = await Promise.all([
      listMyActivities(user.id),
      listMyJoinedActivities(user.id),
      listMyRequestedActivities(user.id),
    ]);
    setHosting(h);
    setGoing(g);
    setRequested(r);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!user) {
          setHosting([]);
          setGoing([]);
          setRequested([]);
          setLoading(false);
          return;
        }
        const [h, g, r] = await Promise.all([
          listMyActivities(user.id),
          listMyJoinedActivities(user.id),
          listMyRequestedActivities(user.id),
        ]);
        if (cancelled) return;
        setHosting(h);
        setGoing(g);
        setRequested(r);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [user]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const startNew = async () => {
    if (!user) return;
    const gate = await canPostActivity(user.id);
    if (!gate.allowed) {
      Alert.alert(
        'Pass needed',
        'Your first activity is on the house. To post more, get a Trip Pass.',
        [
          { text: 'Maybe later', style: 'cancel' },
          { text: 'See plans', onPress: () => router.push('/plans') },
        ],
      );
      return;
    }
    activityDraft.reset();
    router.push('/activities/new/hotel');
  };

  const isEmpty =
    hosting.length === 0 && going.length === 0 && requested.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>MY ACTIVITIES</Text>
          <Text style={styles.title}>Your posts & plans</Text>
        </View>
        <Pressable style={styles.addBtn} hitSlop={6} onPress={startNew}>
          <Ionicons name="add" size={22} color={colors.accent.goldDark} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.gold} />
        </View>
      ) : isEmpty ? (
        <EmptyState onPress={startNew} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent.gold}
            />
          }
        >
          {hosting.length > 0 && (
            <Section title="HOSTING" count={hosting.length}>
              {hosting.map((a) => (
                <ActivityRow
                  key={a.id}
                  activity={a}
                  variant="hosting"
                  onPress={() => router.push(`/activity/${a.id}`)}
                />
              ))}
            </Section>
          )}

          {going.length > 0 && (
            <Section title="GOING" count={going.length}>
              {going.map((a) => (
                <ActivityRow
                  key={a.id}
                  activity={a}
                  variant="going"
                  onPress={() => router.push(`/activity/${a.id}`)}
                />
              ))}
            </Section>
          )}

          {requested.length > 0 && (
            <Section title="REQUESTED" count={requested.length}>
              {requested.map((a) => (
                <ActivityRow
                  key={a.id}
                  activity={a}
                  variant="requested"
                  onPress={() => router.push(`/activity/${a.id}`)}
                />
              ))}
            </Section>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>
        {title} <Text style={styles.sectionCount}>· {count}</Text>
      </Text>
      <View style={{ gap: spacing.sm }}>{children}</View>
    </View>
  );
}

function ActivityRow({
  activity,
  variant,
  onPress,
}: {
  activity: PlaceholderActivity;
  variant: 'hosting' | 'going' | 'requested';
  onPress: () => void;
}) {
  const venue = venueMap[activity.venue];
  const isCancelled = activity.status === 'cancelled';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        isCancelled && styles.rowCancelled,
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.venueBadge}>
        <Ionicons name={venue.icon as any} size={20} color={colors.accent.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.rowVenue, isCancelled && styles.rowTextDimmed]}
        >
          {venue.label}
        </Text>
        <Text style={styles.rowMeta}>
          {activity.dateLabel} · {activity.timeFrom} – {activity.timeTo}
        </Text>
        <Text style={styles.rowHotel} numberOfLines={1}>
          {activity.hotelName}
        </Text>
        {variant !== 'hosting' && (
          <View style={styles.hostLine}>
            <Avatar
              uri={activity.host.avatarUri}
              initial={activity.host.initial}
              size={18}
            />
            <Text style={styles.hostByText}>
              Hosted by {activity.host.firstName}
            </Text>
          </View>
        )}
      </View>
      {isCancelled ? (
        <View style={styles.cancelledTag}>
          <Text style={styles.cancelledTagText}>Cancelled</Text>
        </View>
      ) : variant === 'requested' ? (
        <View style={styles.pendingTag}>
          <Text style={styles.pendingTagText}>Pending</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.text.ghost} />
      )}
    </Pressable>
  );
}

function EmptyState({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="sparkles-outline" size={28} color={colors.accent.gold} />
      </View>
      <Text style={styles.emptyTitle}>Nothing yet</Text>
      <Text style={styles.emptyBody}>
        Post an activity, or join one from Discover.
      </Text>

      <Pressable style={styles.ctaBtn} onPress={onPress}>
        <Ionicons name="add" size={18} color={colors.accent.goldDark} />
        <Text style={styles.ctaText}>New activity</Text>
      </Pressable>

      <Text style={styles.perk}>First post is free.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  kicker: {
    ...typography.tiny,
    color: colors.accent.gold,
    letterSpacing: 3,
    marginBottom: 4,
  },
  title: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 2,
  },
  sectionCount: {
    color: colors.accent.gold,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  venueBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowVenue: {
    ...typography.h3,
    color: colors.text.primary,
  },
  rowMeta: {
    ...typography.small,
    color: colors.accent.gold,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  rowHotel: {
    ...typography.small,
    color: colors.text.muted,
    marginTop: 2,
  },
  hostLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  hostByText: {
    ...typography.small,
    color: colors.text.muted,
  },
  pendingTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.gold,
    backgroundColor: colors.border.active,
  },
  pendingTagText: {
    ...typography.tiny,
    color: colors.accent.gold,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cancelledTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent.red,
    backgroundColor: colors.accent.redBg,
  },
  cancelledTagText: {
    ...typography.tiny,
    color: colors.accent.red,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  rowCancelled: {
    opacity: 0.55,
  },
  rowTextDimmed: {
    textDecorationLine: 'line-through',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  emptyBody: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 50,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.accent.gold,
  },
  ctaText: {
    color: colors.accent.goldDark,
    fontSize: 16,
    fontWeight: '600',
  },
  perk: {
    ...typography.small,
    color: colors.text.faint,
    marginTop: spacing.sm,
  },
});
