import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
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
import { type PlaceholderActivity } from '@/constants/placeholderActivities';
import { venueMap } from '@/constants/venues';
import { getActivity, updateActivity } from '@/lib/activitiesApi';

const NOTE_MAX = 200;
const NOTE_ACCESSORY = 'editNoteDone';

const TIME_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 6; h <= 23; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 23) out.push(`${String(h).padStart(2, '0')}:30`);
  }
  return out;
})();

const DAY_COUNT = 14;

function buildDays(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: DAY_COUNT }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDayLabel(d: Date, offset: number): string {
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export default function EditActivityScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const days = useMemo(buildDays, []);

  const [original, setOriginal] = useState<PlaceholderActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState<string | null>(null);
  const [timeFrom, setTimeFrom] = useState<string | null>(null);
  const [timeTo, setTimeTo] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getActivity(id)
      .then((a) => {
        if (cancelled) return;
        setOriginal(a);
        if (a) {
          setDate(a.dateIso);
          setTimeFrom(a.timeFrom);
          setTimeTo(a.timeTo);
          setNote(a.note);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        Alert.alert(
          'Could not load activity',
          err?.message ?? 'Please try again.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const fromIdx = timeFrom ? TIME_SLOTS.indexOf(timeFrom) : -1;

  const onPickFrom = (slot: string) => {
    setTimeFrom(slot);
    if (timeTo && TIME_SLOTS.indexOf(timeTo) <= TIME_SLOTS.indexOf(slot)) {
      setTimeTo(null);
    }
  };

  const dirty =
    !!original &&
    (date !== original.dateIso ||
      timeFrom !== original.timeFrom ||
      timeTo !== original.timeTo ||
      note.trim() !== original.note);

  const valid =
    !!date &&
    !!timeFrom &&
    !!timeTo &&
    TIME_SLOTS.indexOf(timeTo) > fromIdx;

  const canSave = dirty && valid && !saving;

  const save = async () => {
    if (!canSave || !id) return;
    setSaving(true);
    try {
      await updateActivity(id, {
        date: date!,
        timeFrom: timeFrom!,
        timeTo: timeTo!,
        note: note.trim(),
      });
      Keyboard.dismiss();
      router.back();
    } catch (err: any) {
      Alert.alert('Could not save', err?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NavBar onBack={() => router.back()} onSave={save} canSave={false} saving={false} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.gold} />
        </View>
      </SafeAreaView>
    );
  }

  if (!original) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NavBar onBack={() => router.back()} onSave={save} canSave={false} saving={false} />
        <View style={styles.center}>
          <Text style={styles.missingText}>Activity not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const venue = venueMap[original.venue];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <NavBar
          onBack={() => router.back()}
          onSave={save}
          canSave={canSave}
          saving={saving}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        >
          <View style={styles.intro}>
            <Text style={styles.title}>Edit activity</Text>
            <Text style={styles.subtitle}>
              {venue.label} · {original.hotelName}
            </Text>
          </View>

          <Text style={styles.sectionLabel}>DATE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={styles.dateRow}
          >
            {days.map((d, i) => {
              const iso = toIsoDate(d);
              const active = date === iso;
              return (
                <Pressable
                  key={iso}
                  onPress={() => setDate(iso)}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                >
                  <Text
                    style={[
                      styles.dayChipWeekday,
                      active && styles.dayChipTextActive,
                    ]}
                  >
                    {formatDayLabel(d, i).toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.dayChipDate,
                      active && styles.dayChipTextActive,
                    ]}
                  >
                    {d.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionLabel}>FROM</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={styles.timeRow}
          >
            {TIME_SLOTS.slice(0, -1).map((slot) => {
              const active = timeFrom === slot;
              return (
                <Pressable
                  key={`from-${slot}`}
                  onPress={() => onPickFrom(slot)}
                  style={[styles.timeChip, active && styles.timeChipActive]}
                >
                  <Text
                    style={[
                      styles.timeChipText,
                      active && styles.timeChipTextActive,
                    ]}
                  >
                    {slot}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionLabel}>UNTIL</Text>
          {fromIdx < 0 ? (
            <View style={styles.untilHint}>
              <Text style={styles.untilHintText}>Pick a start time first.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={styles.timeRow}
            >
              {TIME_SLOTS.slice(fromIdx + 1).map((slot) => {
                const active = timeTo === slot;
                return (
                  <Pressable
                    key={`to-${slot}`}
                    onPress={() => setTimeTo(slot)}
                    style={[styles.timeChip, active && styles.timeChipActive]}
                  >
                    <Text
                      style={[
                        styles.timeChipText,
                        active && styles.timeChipTextActive,
                      ]}
                    >
                      {slot}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <Text style={styles.sectionLabel}>NOTE (optional)</Text>
          <View style={styles.noteWrap}>
            <TextInput
              value={note}
              onChangeText={(t) => setNote(t.slice(0, NOTE_MAX))}
              placeholder="A friendly word about what you have in mind."
              placeholderTextColor={colors.text.faint}
              style={styles.noteInput}
              multiline
              maxLength={NOTE_MAX}
              textAlignVertical="top"
              inputAccessoryViewID={Platform.OS === 'ios' ? NOTE_ACCESSORY : undefined}
            />
            <Text style={styles.counter}>
              {note.length}/{NOTE_MAX}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={NOTE_ACCESSORY}>
          <View style={styles.accessory}>
            <Pressable onPress={Keyboard.dismiss} hitSlop={8}>
              <Text style={styles.accessoryDone}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </SafeAreaView>
  );
}

function NavBar({
  onBack,
  onSave,
  canSave,
  saving,
}: {
  onBack: () => void;
  onSave: () => void;
  canSave: boolean;
  saving: boolean;
}) {
  return (
    <View style={styles.navBar}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.navBtn}>
        <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
      </Pressable>
      <Text style={styles.navTitle}>Edit</Text>
      <Pressable onPress={onSave} disabled={!canSave} hitSlop={12}>
        {saving ? (
          <ActivityIndicator color={colors.accent.gold} />
        ) : (
          <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
            Save
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    paddingHorizontal: spacing.xl,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  saveText: {
    ...typography.body,
    color: colors.accent.gold,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
  },
  saveTextDisabled: {
    color: colors.text.ghost,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingText: {
    ...typography.body,
    color: colors.text.muted,
  },
  intro: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    color: colors.text.primary,
    fontSize: 26,
    fontWeight: '300',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.muted,
  },
  sectionLabel: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  dateRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dayChip: {
    width: 62,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    gap: 4,
  },
  dayChipActive: {
    borderColor: colors.accent.gold,
    backgroundColor: colors.border.active,
  },
  dayChipWeekday: {
    ...typography.tiny,
    color: colors.text.muted,
    letterSpacing: 1.2,
  },
  dayChipDate: {
    fontSize: 20,
    fontWeight: '400',
    color: colors.text.primary,
  },
  dayChipTextActive: {
    color: colors.accent.gold,
  },
  timeRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  timeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
  },
  timeChipActive: {
    borderColor: colors.accent.gold,
    backgroundColor: colors.border.active,
  },
  timeChipText: {
    ...typography.body,
    color: colors.text.muted,
  },
  timeChipTextActive: {
    color: colors.accent.gold,
    fontWeight: '500',
  },
  untilHint: {
    paddingVertical: spacing.md,
  },
  untilHintText: {
    ...typography.small,
    color: colors.text.faint,
    fontStyle: 'italic',
  },
  noteWrap: {
    gap: spacing.xs,
  },
  noteInput: {
    minHeight: 90,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    padding: spacing.md,
    color: colors.text.primary,
    fontSize: 15,
    lineHeight: 21,
  },
  counter: {
    ...typography.small,
    color: colors.text.faint,
    textAlign: 'right',
  },
  accessory: {
    backgroundColor: colors.bg.secondary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    alignItems: 'flex-end',
  },
  accessoryDone: {
    color: colors.accent.gold,
    fontSize: 17,
    fontWeight: '600',
  },
});
