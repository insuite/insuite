import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/constants/colors';
import { venues, type VenueKey } from '@/constants/venues';
import { onboardingDraft, useOnboardingDraft } from '@/stores/onboardingDraftStore';

export default function OnboardingActivitiesScreen() {
  const router = useRouter();
  const draft = useOnboardingDraft();
  const [selected, setSelected] = useState<Set<VenueKey>>(
    new Set(draft.openTo),
  );
  const valid = selected.size > 0;

  const proceed = () => {
    if (!valid) return;
    onboardingDraft.set({ openTo: Array.from(selected) });
    router.push('/onboarding/bio');
  };

  const toggle = (key: VenueKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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

      <View style={styles.intro}>
        <Text style={styles.title}>What are you{'\n'}open to?</Text>
        <Text style={styles.subtitle}>Pick the kinds of meetups you'd join.</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {venues.map((venue) => {
          const active = selected.has(venue.key);
          return (
            <Pressable
              key={venue.key}
              onPress={() => toggle(venue.key)}
              style={({ pressed }) => [
                styles.card,
                active && styles.cardActive,
                pressed && styles.cardPressed,
              ]}
            >
              <Ionicons
                name={venue.icon as any}
                size={28}
                color={active ? colors.accent.gold : colors.text.muted}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardLabel, active && styles.cardLabelActive]}>
                  {venue.label}
                </Text>
                <Text style={styles.cardDesc}>{venue.description}</Text>
              </View>
              {active && (
                <Ionicons name="checkmark-circle" size={22} color={colors.accent.gold} />
              )}
            </Pressable>
          );
        })}
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
          <Text style={[styles.primaryBtnText, !valid && styles.primaryBtnTextDisabled]}>
            Continue {valid ? `· ${selected.size}` : ''}
          </Text>
        </Pressable>
      </View>
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
    paddingBottom: spacing.xl,
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
  grid: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.card,
  },
  cardActive: {
    borderColor: colors.accent.gold,
    backgroundColor: colors.border.active,
  },
  cardPressed: {
    opacity: 0.75,
  },
  cardLabel: {
    ...typography.h3,
    color: colors.text.muted,
  },
  cardLabelActive: {
    color: colors.text.primary,
  },
  cardDesc: {
    ...typography.small,
    color: colors.text.faint,
    marginTop: 2,
  },
  footer: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
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
});
