import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { venueFilters, venueMap, type VenueKey } from '@/constants/venues';
import { listActivities } from '@/lib/activitiesApi';
import { useAuth } from '@/stores/authStore';

type FilterKey = VenueKey | 'all';

export default function DiscoverScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [activities, setActivities] = useState<PlaceholderActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // User-initiated refresh path — no race protection needed since the user
  // is on the screen waiting for it.
  const load = useCallback(async () => {
    const list = await listActivities(user?.id);
    setActivities(list);
    setLoading(false);
  }, [user]);

  // Focus-effect path uses a cancelled flag so a stale fetch (e.g. from a
  // quick tab switch or sign-out mid-flight) can't overwrite fresh state.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const list = await listActivities(user?.id);
        if (cancelled) return;
        setActivities(list);
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

  const feed =
    filter === 'all'
      ? activities
      : activities.filter((a) => a.venue === filter);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>DISCOVER</Text>
          <Text style={styles.title}>Tonight in Singapore</Text>
        </View>
        <Pressable style={styles.cityChip} hitSlop={6}>
          <Ionicons name="location-outline" size={14} color={colors.accent.gold} />
          <Text style={styles.cityChipText}>Singapore</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {venueFilters.map((f) => {
          const active = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text
                style={[styles.filterChipText, active && styles.filterChipTextActive]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.feed}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent.gold}
          />
        }
      >
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={colors.accent.gold} />
          </View>
        ) : (
          <>
            {feed.map((a) => (
              <ActivityCard
                key={a.id}
                activity={a}
                onPress={() => router.push(`/activity/${a.id}`)}
              />
            ))}

            {feed.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {activities.length === 0
                    ? 'No activities yet — be the first to post one.'
                    : 'No activities match this filter.'}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActivityCard({
  activity,
  onPress,
}: {
  activity: PlaceholderActivity;
  onPress: () => void;
}) {
  const venue = venueMap[activity.venue];
  const flags = activity.host.languages.map((l) => l.flag).join(' ');
  const hasNote = activity.note.length > 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.cardHead}>
        <View style={styles.venueBadge}>
          <Ionicons name={venue.icon as any} size={18} color={colors.accent.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.venueLabel}>{venue.label}</Text>
          <Text style={styles.cardMeta}>
            {activity.dateLabel} · {activity.timeFrom} – {activity.timeTo}
          </Text>
        </View>
      </View>

      {hasNote && (
        <Text style={styles.note} numberOfLines={2}>
          {activity.note}
        </Text>
      )}

      <View style={[styles.cardFoot, hasNote && styles.cardFootDivided]}>
        <View style={styles.hostBlock}>
          <Avatar
            uri={activity.host.avatarUri}
            initial={activity.host.initial}
            size={26}
          />
          <Text style={styles.hostName}>{activity.host.firstName}</Text>
        </View>
        <Text style={styles.flagRow}>{flags}</Text>
      </View>
    </Pressable>
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
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
  },
  cityChipText: {
    ...typography.small,
    color: colors.text.secondary,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
  },
  filterChipActive: {
    borderColor: colors.accent.gold,
    backgroundColor: colors.border.active,
  },
  filterChipText: {
    ...typography.small,
    color: colors.text.muted,
  },
  filterChipTextActive: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  feed: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
    gap: spacing.md,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  venueBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueLabel: {
    ...typography.h3,
    color: colors.text.primary,
  },
  cardMeta: {
    ...typography.small,
    color: colors.text.muted,
    marginTop: 2,
  },
  note: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 21,
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardFootDivided: {
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  hostBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hostName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  flagRow: {
    fontSize: 14,
    letterSpacing: 2,
  },
  emptyState: {
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.text.muted,
  },
});
