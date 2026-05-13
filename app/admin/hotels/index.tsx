import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/constants/colors';
import { listHotelsForAdmin, type AdminHotel } from '@/lib/adminApi';

import { AdminGate } from '@/components/admin/AdminGate';

export default function AdminHotelsList() {
  const router = useRouter();
  const [hotels, setHotels] = useState<AdminHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      listHotelsForAdmin()
        .then((list) => {
          if (cancelled) return;
          setHotels(list);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return hotels;
    return hotels.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q) ||
        h.country.toLowerCase().includes(q),
    );
  }, [hotels, query]);

  // Admin chip row — unlike the user-facing picker, no PINNED / EXCLUDED
  // curation since the admin needs to see the full catalog distribution.
  // Pure count-based, top 12 cities. Tapping a chip drops the city name
  // into the search query (same mechanism as the activity picker).
  const cityChips = useMemo(() => {
    const counts = new Map<string, number>();
    for (const h of hotels) {
      counts.set(h.city, (counts.get(h.city) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
      .map(([city]) => city)
      .slice(0, 12);
  }, [hotels]);

  const activeCity = query.trim().toLowerCase();

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
          <Text style={styles.navTitle}>Hotels</Text>
          <Pressable
            onPress={() => router.push('/admin/hotels/new')}
            hitSlop={12}
            style={styles.navBtn}
          >
            <Ionicons name="add" size={26} color={colors.accent.gold} />
          </Pressable>
        </View>

        {cityChips.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cityChipsRow}
            style={styles.cityChipsScroll}
          >
            <Pressable
              onPress={() => setQuery('')}
              style={[
                styles.cityChip,
                activeCity === '' && styles.cityChipActive,
              ]}
            >
              <Text
                style={[
                  styles.cityChipText,
                  activeCity === '' && styles.cityChipTextActive,
                ]}
              >
                All
              </Text>
            </Pressable>
            {cityChips.map((city) => {
              const isActive = activeCity === city.toLowerCase();
              return (
                <Pressable
                  key={city}
                  onPress={() => setQuery(city)}
                  style={[styles.cityChip, isActive && styles.cityChipActive]}
                >
                  <Text
                    style={[
                      styles.cityChipText,
                      isActive && styles.cityChipTextActive,
                    ]}
                  >
                    {city}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.text.faint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, city, country"
            placeholderTextColor={colors.text.faint}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent.gold} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(h) => h.id}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <Text style={styles.countLine}>
                {filtered.length} of {hotels.length}
                {query ? ` matching "${query}"` : ''}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/admin/hotels/${item.id}`)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.rowSub}>
                    {item.city} · {item.country}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.text.ghost}
                />
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {query ? `No hotels match "${query}".` : 'No hotels yet.'}
              </Text>
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
  cityChipsScroll: {
    flexGrow: 0,
    height: 54,
    marginBottom: spacing.xs,
  },
  cityChipsRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cityChip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityChipActive: {
    borderColor: colors.accent.gold,
    backgroundColor: colors.border.active,
  },
  cityChipText: {
    ...typography.small,
    color: colors.text.secondary,
  },
  cityChipTextActive: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
  },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  countLine: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  rowName: { ...typography.body, color: colors.text.primary, fontWeight: '500' },
  rowSub: { ...typography.small, color: colors.text.muted, marginTop: 2 },
  empty: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
