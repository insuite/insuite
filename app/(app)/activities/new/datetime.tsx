import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
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
import { activityDraft, useActivityDraft } from '@/stores/activityDraftStore';

const NOTE_MAX = 200;
const NOTE_ACCESSORY = 'noteDone';

// Half-hour slots from 06:00 to 23:00 inclusive.
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

export default function DateTimeStep() {
  const router = useRouter();
  const draft = useActivityDraft();
  const days = useMemo(buildDays, []);

  const [date, setDate] = useState<string | null>(draft.date);
  const [timeFrom, setTimeFrom] = useState<string | null>(draft.timeFrom);
  const [timeTo, setTimeTo] = useState<string | null>(draft.timeTo);
  const [note, setNote] = useState(draft.note);

  const fromIdx = timeFrom ? TIME_SLOTS.indexOf(timeFrom) : -1;
  const valid =
    !!date &&
    !!timeFrom &&
    !!timeTo &&
    TIME_SLOTS.indexOf(timeTo) > fromIdx;

  const onPickFrom = (slot: string) => {
    setTimeFrom(slot);
    if (timeTo && TIME_SLOTS.indexOf(timeTo) <= TIME_SLOTS.indexOf(slot)) {
      setTimeTo(null);
    }
  };

  const proceed = () => {
    if (!valid) return;
    activityDraft.set({
      date,
      timeFrom,
      timeTo,
      note: note.trim(),
    });
    Keyboard.dismiss();
    router.push('/activities/new/confirm');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text.muted} />
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '75%' }]} />
        </View>
        <Text style={styles.step}>3 / 4</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        <View style={styles.intro}>
          <Text style={styles.title}>When?</Text>
          <Text style={styles.subtitle}>
            Pick a day and a window in half-hour increments.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>DATE</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
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

      <View style={styles.footer}>
        <Pressable
          disabled={!valid}
          onPress={proceed}
          style={({ pressed }) => [
            styles.primaryBtn,
            !valid && styles.primaryBtnDisabled,
            pressed && valid && styles.primaryBtnPressed,
          ]}
        >
          <Text
            style={[styles.primaryBtnText, !valid && styles.primaryBtnTextDisabled]}
          >
            Continue
          </Text>
        </Pressable>
      </View>

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
  primaryBtnDisabled: {
    backgroundColor: colors.border.default,
  },
  primaryBtnPressed: {
    opacity: 0.85,
  },
  primaryBtnText: {
    color: colors.accent.goldDark,
    fontSize: 17,
    fontWeight: '600',
  },
  primaryBtnTextDisabled: {
    color: colors.text.faint,
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
