import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/constants/colors';
import { signInWithApple } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { authStore } from '@/stores/authStore';
import { onboardingDraft } from '@/stores/onboardingDraftStore';

export default function WelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    onboardingDraft.reset();

    // Skeleton fallback when Supabase env vars are not set yet —
    // jump straight into onboarding so the UI can be previewed.
    if (!isSupabaseConfigured) {
      router.push('/onboarding/name');
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithApple();

      // Web: signInWithApple kicked off a full-page redirect and returned
      // null — the browser is about to navigate to Apple, then back to "/"
      // where the auth gate picks up the session via onAuthStateChange.
      if (!result) return;

      const { appleGivenName, session } = result;

      // Synchronously load the profile (don't race with the auth listener) so
      // we know whether to route to Discover or Onboarding.
      await authStore.applySession(session);

      const status = authStore.get().status;
      if (status === 'ready') {
        router.replace('/discover');
      } else {
        // First-time user — pre-fill name from Apple's credential when shared.
        if (appleGivenName) {
          onboardingDraft.set({ firstName: appleGivenName });
        }
        router.replace('/onboarding/name');
      }
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('Sign in failed', err?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.brand}>INSUITE</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.title}>Never dine{'\n'}alone again.</Text>
        <Text style={styles.subtitle}>
          Meet fellow solo guests at your hotel — for breakfast, a workout, drinks in the lounge, or dinner.
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          disabled={loading}
          style={({ pressed }) => [
            styles.appleButton,
            pressed && !loading && styles.appleButtonPressed,
          ]}
          onPress={handleSignIn}
        >
          {loading ? (
            <ActivityIndicator color={colors.accent.goldDark} />
          ) : (
            <>
              <Ionicons
                name="logo-apple"
                size={20}
                color={colors.accent.goldDark}
              />
              <Text style={styles.appleButtonText}>Continue with Apple</Text>
            </>
          )}
        </Pressable>

        {isSupabaseConfigured ? (
          <Text style={styles.terms}>
            By continuing you agree to our{' '}
            <Text style={styles.termsLink} onPress={() => router.push('/legal/terms')}>
              Terms
            </Text>
            {' & '}
            <Text style={styles.termsLink} onPress={() => router.push('/legal/privacy')}>
              Privacy
            </Text>
            .
          </Text>
        ) : (
          <Text style={styles.terms}>
            Demo mode — set EXPO_PUBLIC_SUPABASE_URL in .env to enable real sign-in.
          </Text>
        )}
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
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  brand: {
    ...typography.tiny,
    color: colors.accent.gold,
    letterSpacing: 4,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: colors.text.primary,
    fontSize: 40,
    fontWeight: '300',
    letterSpacing: 0.5,
    lineHeight: 48,
    marginBottom: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.muted,
    lineHeight: 22,
    maxWidth: 320,
  },
  footer: {
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  appleButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  appleButtonPressed: {
    backgroundColor: '#e8e8e8',
  },
  appleButtonText: {
    color: colors.accent.goldDark,
    fontSize: 17,
    fontWeight: '600',
  },
  terms: {
    ...typography.small,
    color: colors.text.faint,
    textAlign: 'center',
  },
  termsLink: {
    color: colors.text.muted,
    textDecorationLine: 'underline',
  },
});
