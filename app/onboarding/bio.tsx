import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/constants/colors';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { authStore } from '@/stores/authStore';
import { onboardingDraft, useOnboardingDraft } from '@/stores/onboardingDraftStore';
import { profileStore } from '@/stores/profileStore';

const MAX_LEN = 120;
const ACCESSORY_ID = 'bioAccessory';

function generateReferralCode(name: string): string {
  const prefix = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'GUEST';
  const suffix = Math.floor(Math.random() * 10);
  return `${prefix}${suffix}`;
}

export default function OnboardingBioScreen() {
  const router = useRouter();
  const draft = useOnboardingDraft();
  const [bio, setBio] = useState(draft.bio);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    Keyboard.dismiss();
    const trimmed = bio.trim();
    const firstName = draft.firstName || 'You';
    const referralCode = generateReferralCode(firstName);

    // Always update local store so the UI feels instant.
    profileStore.set({
      firstName,
      languages: draft.languages,
      openTo: draft.openTo,
      bio: trimmed,
      referralCode,
    });

    if (isSupabaseConfigured && supabase) {
      setSaving(true);
      try {
        // Pull session straight from supabase to avoid stale authStore state.
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No active session — please sign in again.');
        }

        const { data: written, error } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            first_name: firstName,
            bio: trimmed || null,
            languages: draft.languages,
            open_to: draft.openTo,
            vibe_tags: [],
            avatar_url: null,
            referral_code: referralCode,
          })
          .select('id')
          .maybeSingle();
        if (error) throw error;
        if (!written) {
          throw new Error(
            `Upsert returned no row for user ${session.user.id.slice(0, 8)}…. Check RLS policy on profiles.`,
          );
        }

        // Re-run applySession so authStore.status flips to `ready` and the
        // canonical profile (with server-side defaults) lands in profileStore.
        await authStore.applySession(session);
      } catch (err: any) {
        Alert.alert('Could not save profile', err?.message ?? 'Please try again.');
        setSaving(false);
        return;
      }
    }

    onboardingDraft.reset();
    router.replace('/discover');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} hitSlop={12}>
                <Ionicons name="chevron-back" size={24} color={colors.text.muted} />
              </Pressable>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: '100%' }]} />
              </View>
              <Text style={styles.step}>4 / 4</Text>
            </View>

            <View style={styles.content}>
              <Text style={styles.title}>One-line bio{'\n'}(optional)</Text>
              <Text style={styles.subtitle}>A quick hello for future co-guests.</Text>

              <View style={styles.inputWrap}>
                <TextInput
                  value={bio}
                  onChangeText={(t) => setBio(t.slice(0, MAX_LEN))}
                  placeholder="Business traveller, always up for a quiet coffee."
                  placeholderTextColor={colors.text.faint}
                  style={styles.input}
                  multiline
                  maxLength={MAX_LEN}
                  textAlignVertical="top"
                  inputAccessoryViewID={
                    Platform.OS === 'ios' ? ACCESSORY_ID : undefined
                  }
                />
                <Text style={styles.counter}>
                  {bio.length}/{MAX_LEN}
                </Text>
              </View>
            </View>

            <View style={styles.footer}>
              <Pressable
                onPress={finish}
                disabled={saving}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && !saving && styles.primaryBtnPressed,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={colors.accent.goldDark} />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {bio.trim().length > 0 ? 'Done' : 'Skip for now'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={ACCESSORY_ID}>
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
    minHeight: 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    padding: spacing.lg,
    fontSize: 17,
    color: colors.text.primary,
    lineHeight: 24,
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
  primaryBtnPressed: {
    opacity: 0.85,
  },
  primaryBtnText: {
    color: colors.accent.goldDark,
    fontSize: 17,
    fontWeight: '600',
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
