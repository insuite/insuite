import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/constants/colors';
import { languages } from '@/constants/languages';
import { onboardingDraft, useOnboardingDraft } from '@/stores/onboardingDraftStore';

export default function OnboardingLanguagesScreen() {
  const router = useRouter();
  const draft = useOnboardingDraft();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(draft.languages),
  );
  const valid = selected.size > 0;

  const proceed = () => {
    if (!valid) return;
    onboardingDraft.set({ languages: Array.from(selected) });
    router.push('/onboarding/activities');
  };

  const toggle = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
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
          <View style={[styles.progressFill, { width: '50%' }]} />
        </View>
        <Text style={styles.step}>2 / 4</Text>
      </View>

      <View style={styles.intro}>
        <Text style={styles.title}>Languages{'\n'}you speak</Text>
        <Text style={styles.subtitle}>
          So we can match you with guests you can chat with.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {languages.map((lang) => {
          const active = selected.has(lang.code);
          return (
            <Pressable
              key={lang.code}
              onPress={() => toggle(lang.code)}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && styles.chipPressed,
              ]}
            >
              <Text style={styles.chipFlag}>{lang.flag}</Text>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {lang.name}
              </Text>
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
  },
  chipActive: {
    borderColor: colors.accent.gold,
    backgroundColor: colors.border.active,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipFlag: {
    fontSize: 16,
  },
  chipText: {
    ...typography.body,
    color: colors.text.muted,
  },
  chipTextActive: {
    color: colors.text.primary,
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
