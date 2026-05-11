import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { colors, radius, spacing, typography } from '@/constants/colors';
import { type PlaceholderActivity } from '@/constants/placeholderActivities';
import { venueFilters, venueMap, type VenueKey } from '@/constants/venues';
import { listActivities, listCities, type CitySummary } from '@/lib/activitiesApi';
import { useAuth } from '@/stores/authStore';

type FilterKey = VenueKey | 'all';

const REFERRAL_BANNER_KEY = 'discover_referral_banner_dismissed';
const SELECTED_CITY_KEY = 'discover_selected_city';

export default function DiscoverScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [activities, setActivities] = useState<PlaceholderActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  // null = "All cities", otherwise filter activities to this city.
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [cities, setCities] = useState<CitySummary[]>([]);

  // Restore the previously-picked city across launches so the user doesn't
  // have to re-pick every time. AsyncStorage is the same one we use for the
  // referral banner — no extra dep.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SELECTED_CITY_KEY)
      .then((v) => {
        if (!cancelled && v) setSelectedCity(v);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    listCities()
      .then((list) => {
        if (!cancelled) setCities(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const pickCity = (city: string | null) => {
    setSelectedCity(city);
    setCityPickerOpen(false);
    if (city) {
      AsyncStorage.setItem(SELECTED_CITY_KEY, city).catch(() => {});
    } else {
      AsyncStorage.removeItem(SELECTED_CITY_KEY).catch(() => {});
    }
  };

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(REFERRAL_BANNER_KEY)
      .then((v) => {
        if (!cancelled && v !== 'true') setBannerVisible(true);
      })
      .catch(() => {
        // Storage failure shouldn't block the feed — leave banner hidden.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissBanner = () => {
    setBannerVisible(false);
    AsyncStorage.setItem(REFERRAL_BANNER_KEY, 'true').catch(() => {});
  };

  // User-initiated refresh path — no race protection needed since the user
  // is on the screen waiting for it.
  const load = useCallback(async () => {
    setErrored(false);
    try {
      const list = await listActivities(user?.id);
      setActivities(list);
    } catch (err: any) {
      console.warn('[discover] list failed', err?.message ?? err);
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Focus-effect path uses a cancelled flag so a stale fetch (e.g. from a
  // quick tab switch or sign-out mid-flight) can't overwrite fresh state.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setErrored(false);
        try {
          const list = await listActivities(user?.id);
          if (cancelled) return;
          setActivities(list);
        } catch (err: any) {
          if (cancelled) return;
          console.warn('[discover] list failed', err?.message ?? err);
          setErrored(true);
        } finally {
          if (!cancelled) setLoading(false);
        }
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

  const cityFiltered = selectedCity
    ? activities.filter(
        (a) => a.hotelCity.toLowerCase() === selectedCity.toLowerCase(),
      )
    : activities;
  const feed =
    filter === 'all'
      ? cityFiltered
      : cityFiltered.filter((a) => a.venue === filter);

  const headlineCity = selectedCity ?? 'anywhere';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>DISCOVER</Text>
          <Text style={styles.title} numberOfLines={1}>
            Tonight in {headlineCity}
          </Text>
        </View>
        <Pressable
          style={styles.cityChip}
          onPress={() => setCityPickerOpen(true)}
          hitSlop={6}
        >
          <Ionicons name="location-outline" size={14} color={colors.accent.gold} />
          <Text style={styles.cityChipText} numberOfLines={1}>
            {selectedCity ?? 'All cities'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={colors.accent.gold} />
        </Pressable>
      </View>

      <CityPickerModal
        visible={cityPickerOpen}
        cities={cities}
        selected={selectedCity}
        onClose={() => setCityPickerOpen(false)}
        onPick={pickCity}
      />

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
        {bannerVisible && (
          <View style={styles.banner}>
            <Pressable
              onPress={() => router.push('/plans/referral')}
              style={({ pressed }) => [styles.bannerInner, pressed && { opacity: 0.85 }]}
              hitSlop={4}
            >
              <View style={styles.bannerIcon}>
                <Ionicons name="gift-outline" size={18} color={colors.accent.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Invite friends, earn 7-day passes</Text>
                <Text style={styles.bannerBody}>
                  Each friend who joins gets you 7 days free.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.accent.gold} />
            </Pressable>
            <Pressable
              onPress={dismissBanner}
              style={styles.bannerClose}
              hitSlop={10}
              accessibilityLabel="Dismiss"
            >
              <Ionicons name="close" size={14} color={colors.text.muted} />
            </Pressable>
          </View>
        )}

        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={colors.accent.gold} />
          </View>
        ) : errored ? (
          <View style={styles.errorWrap}>
            <LoadErrorState title="Couldn't load activities." onRetry={load} />
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

function CityPickerModal({
  visible,
  cities,
  selected,
  onClose,
  onPick,
}: {
  visible: boolean;
  cities: CitySummary[];
  selected: string | null;
  onClose: () => void;
  onPick: (city: string | null) => void;
}) {
  const [query, setQuery] = useState('');

  // Reset search when the modal reopens.
  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const filtered = query.trim()
    ? cities.filter((c) =>
        `${c.city} ${c.country}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : cities;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.pickerContainer} edges={['top', 'bottom']}>
        <View style={styles.pickerHeader}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.pickerCancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.pickerTitle}>Choose city</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.pickerSearch}>
          <Ionicons name="search" size={16} color={colors.text.faint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search cities"
            placeholderTextColor={colors.text.faint}
            style={styles.pickerSearchInput}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(c) => `${c.city}|${c.country}`}
          contentContainerStyle={styles.pickerList}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Pressable
              onPress={() => onPick(null)}
              style={({ pressed }) => [
                styles.pickerRow,
                selected === null && styles.pickerRowSelected,
                pressed && { opacity: 0.6 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerRowName}>All cities</Text>
                <Text style={styles.pickerRowSub}>Show activities everywhere</Text>
              </View>
              {selected === null && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.accent.gold}
                />
              )}
            </Pressable>
          }
          renderItem={({ item }) => {
            const isSelected =
              selected != null && selected.toLowerCase() === item.city.toLowerCase();
            return (
              <Pressable
                onPress={() => onPick(item.city)}
                style={({ pressed }) => [
                  styles.pickerRow,
                  isSelected && styles.pickerRowSelected,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerRowName}>{item.city}</Text>
                  <Text style={styles.pickerRowSub}>
                    {item.country} · {item.hotelCount} hotels
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.accent.gold}
                  />
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.pickerEmpty}>
              {query ? `No cities match "${query}".` : 'No cities yet.'}
            </Text>
          }
        />
      </SafeAreaView>
    </Modal>
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
          <Text style={styles.hotelName} numberOfLines={1}>
            {activity.hotelName}
          </Text>
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
    height: 60,
    marginBottom: spacing.md,
  },
  filterRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: 11,
    alignItems: 'center',
  },
  filterChip: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    borderColor: colors.accent.gold,
    backgroundColor: colors.border.active,
  },
  filterChipText: {
    ...typography.small,
    color: colors.text.secondary,
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
  banner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.gold,
    backgroundColor: colors.bg.secondary,
    overflow: 'hidden',
  },
  bannerInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
  },
  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.gold,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    ...typography.small,
    color: colors.accent.gold,
    fontWeight: '600',
  },
  bannerBody: {
    ...typography.tiny,
    color: colors.text.muted,
    marginTop: 2,
    letterSpacing: 0,
    textTransform: 'none',
  },
  bannerClose: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border.subtle,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  pickerCancel: {
    ...typography.body,
    color: colors.text.muted,
    width: 60,
  },
  pickerTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
  },
  pickerSearchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 15,
  },
  pickerList: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  pickerRowSelected: {
    backgroundColor: colors.border.active,
  },
  pickerRowName: {
    ...typography.h3,
    color: colors.text.primary,
  },
  pickerRowSub: {
    ...typography.small,
    color: colors.text.muted,
    marginTop: 2,
  },
  pickerEmpty: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
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
  hotelName: {
    ...typography.small,
    color: colors.text.secondary,
    fontWeight: '500',
    marginTop: 2,
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
  errorWrap: {
    minHeight: 280,
    paddingTop: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.muted,
  },
});
