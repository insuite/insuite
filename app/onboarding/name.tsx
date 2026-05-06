import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/constants/colors';
import { onboardingDraft, useOnboardingDraft } from '@/stores/onboardingDraftStore';

const MAX_LEN = 20;

export default function OnboardingNameScreen() {
  const router = useRouter();
  const draft = useOnboardingDraft();
  const [name, setName] = useState(draft.firstName);
  const trimmed = name.trim();
  const valid = trimmed.length > 0 && trimmed.length <= MAX_LEN;

  const proceed = () => {
    if (!valid) return;
    onboardingDraft.set({ firstName: trimmed });
    router.push('/onboarding/languages');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.text.muted} />
          </Pressable>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '25%' }]} />
          </View>
          <Text style={styles.step}>1 / 4</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>What's your{'\n'}first name?</Text>
          <Text style={styles.subtitle}>This is how fellow guests will see you.</Text>

          <View style={styles.inputWrap}>
            <TextInput
              value={name}
              onChangeText={(t) => setName(t.slice(0, MAX_LEN))}
              placeholder="James"
              placeholderTextColor={colors.text.faint}
              style={styles.input}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              maxLength={MAX_LEN}
              onSubmitEditing={() => valid && proceed()}
            />
            <Text style={styles.counter}>
              {trimmed.length}/{MAX_LEN}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            disabled={!valid}
            onPress={() => proceed()}
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
      </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    paddingTop: spacing.xxl,
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
    marginBottom: spacing.xxl,
  },
  inputWrap: {
    gap: spacing.xs,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: spacing.md,
    fontSize: 24,
    color: colors.text.primary,
    fontWeight: '300',
  },
  counter: {
    ...typography.small,
    color: colors.text.faint,
    textAlign: 'right',
  },
  footer: {
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
