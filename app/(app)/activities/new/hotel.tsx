import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/constants/colors';
import type { Hotel } from '@/constants/hotels';
import { listHotels, submitHotelRequest } from '@/lib/activitiesApi';
import { activityDraft, useActivityDraft } from '@/stores/activityDraftStore';

export default function HotelStep() {
  const router = useRouter();
  const draft = useActivityDraft();
  const [query, setQuery] = useState('');
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listHotels().then((list) => {
      if (cancelled) return;
      setHotels(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return hotels;
    return hotels.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q) ||
        h.country.toLowerCase().includes(q),
    );
  }, [query, hotels]);

  // Top cities for quick-filter chips above the search box. Sorted by hotel
  // count desc so the most-stocked cities show first; cap at 8 to keep one
  // horizontal row from feeling unbounded. PINNED cities are always present
  // (regardless of count) — useful for the home market that may not have the
  // most rooms but still matters editorially.
  const cityChips = useMemo(() => {
    const PINNED = ['Taipei'];
    const counts = new Map<string, number>();
    for (const h of hotels) {
      counts.set(h.city, (counts.get(h.city) ?? 0) + 1);
    }
    const sorted = Array.from(counts.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
      .map(([city]) => city);
    const pinned = PINNED.filter((c) => counts.has(c));
    const rest = sorted.filter((c) => !pinned.includes(c)).slice(0, 8);
    return [...pinned, ...rest];
  }, [hotels]);

  const activeCity = query.trim().toLowerCase();

  const pickHotel = (h: Hotel) => {
    activityDraft.set({
      hotelId: h.id,
      hotelName: h.name,
      hotelCity: h.city,
    });
    Keyboard.dismiss();
    router.push('/activities/new/venue');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text.muted} />
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '25%' }]} />
        </View>
        <Text style={styles.step}>1 / 4</Text>
      </View>

      <View style={styles.intro}>
        <Text style={styles.title}>Where are{'\n'}you staying?</Text>
        <Text style={styles.subtitle}>
          Fellow guests at the same hotel can join you.
        </Text>
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
          placeholder="Search by hotel or city"
          placeholderTextColor={colors.text.faint}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent.gold} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(h) => h.id}
          keyboardShouldPersistTaps="handled"
          style={styles.listWrap}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const selected = draft.hotelId === item.id;
            return (
              <Pressable
                onPress={() => pickHotel(item)}
                style={({ pressed }) => [
                  styles.row,
                  selected && styles.rowSelected,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowCity}>
                    {item.city} · {item.country}
                  </Text>
                </View>
                {selected && (
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
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {query ? `No hotels match "${query}".` : 'No hotels yet.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            <Pressable
              onPress={() => setRequestOpen(true)}
              style={({ pressed }) => [
                styles.requestFooter,
                pressed && styles.rowPressed,
              ]}
            >
              <View style={styles.requestFooterIcon}>
                <Ionicons name="add" size={18} color={colors.accent.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.requestFooterTitle}>
                  Request to add a hotel
                </Text>
                <Text style={styles.requestFooterSub}>
                  Don't see yours? We'll review and add it.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.text.faint}
              />
            </Pressable>
          }
        />
      )}

      <RequestHotelModal
        visible={requestOpen}
        prefilledName={query.trim()}
        onClose={() => setRequestOpen(false)}
      />
    </SafeAreaView>
  );
}

function RequestHotelModal({
  visible,
  prefilledName,
  onClose,
}: {
  visible: boolean;
  prefilledName: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(prefilledName);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Re-sync the prefilled name whenever the modal opens with a fresh query.
  useEffect(() => {
    if (visible) {
      setName(prefilledName);
      setCity('');
      setCountry('');
      setNotes('');
    }
  }, [visible, prefilledName]);

  const canSubmit =
    name.trim().length >= 2 &&
    city.trim().length >= 2 &&
    country.trim().length >= 2 &&
    !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await submitHotelRequest({ name, city, country, notes });
      onClose();
      Alert.alert(
        'Thanks for the suggestion',
        "We'll review it within a few days and add it to the catalog if it's a fit.",
      );
    } catch (err: any) {
      Alert.alert('Could not submit', err?.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Request hotel</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalIntro}>
              Don't see your hotel? Send it our way — we'll review and add it.
            </Text>

            <FieldLabel>HOTEL NAME</FieldLabel>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. The Aman New York"
              placeholderTextColor={colors.text.faint}
              style={styles.modalInput}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={120}
            />

            <FieldLabel>CITY</FieldLabel>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="e.g. New York"
              placeholderTextColor={colors.text.faint}
              style={styles.modalInput}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={80}
            />

            <FieldLabel>COUNTRY</FieldLabel>
            <TextInput
              value={country}
              onChangeText={setCountry}
              placeholder="e.g. United States"
              placeholderTextColor={colors.text.faint}
              style={styles.modalInput}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={80}
            />

            <FieldLabel>NOTES (OPTIONAL)</FieldLabel>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything we should know? Branch, neighborhood…"
              placeholderTextColor={colors.text.faint}
              style={[styles.modalInput, styles.modalInputMultiline]}
              multiline
              maxLength={500}
            />

            <Pressable
              onPress={submit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.submitBtn,
                !canSubmit && styles.submitBtnDisabled,
                pressed && canSubmit && { opacity: 0.85 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.accent.goldDark} />
              ) : (
                <Text
                  style={[
                    styles.submitBtnText,
                    !canSubmit && styles.submitBtnTextDisabled,
                  ]}
                >
                  Submit request
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
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
  cityChipsScroll: {
    flexGrow: 0,
    height: 60,
    marginBottom: spacing.sm,
    marginHorizontal: -spacing.xl,
  },
  cityChipsRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: 11,
    alignItems: 'center',
  },
  cityChip: {
    height: 38,
    paddingHorizontal: 16,
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
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 16,
  },
  listWrap: {
    flex: 1,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  rowSelected: {
    backgroundColor: colors.border.active,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowName: {
    ...typography.h3,
    color: colors.text.primary,
  },
  rowCity: {
    ...typography.small,
    color: colors.text.muted,
    marginTop: 2,
  },
  empty: {
    paddingTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.muted,
  },
  requestFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    marginTop: spacing.md,
  },
  requestFooterIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestFooterTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  requestFooterSub: {
    ...typography.small,
    color: colors.text.muted,
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  modalCancel: {
    ...typography.body,
    color: colors.text.muted,
    width: 60,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  modalIntro: {
    ...typography.body,
    color: colors.text.muted,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  fieldLabel: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 2,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  modalInput: {
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    color: colors.text.primary,
    fontSize: 16,
  },
  modalInputMultiline: {
    height: 96,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    textAlignVertical: 'top',
  },
  submitBtn: {
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  submitBtnDisabled: {
    backgroundColor: colors.border.default,
  },
  submitBtnText: {
    color: colors.accent.goldDark,
    fontSize: 17,
    fontWeight: '600',
  },
  submitBtnTextDisabled: {
    color: colors.text.faint,
  },
});
