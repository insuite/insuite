import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import { redeemReferralCode } from '@/lib/referralsApi';

type Status = 'idle' | 'checking' | 'success' | 'error';

export default function RedeemScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const redeem = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length === 0) return;
    setStatus('checking');
    setMessage(null);
    const result = await redeemReferralCode(trimmed);
    if (!result.ok) {
      setStatus('error');
      setMessage(result.error);
      return;
    }
    setStatus('success');
    setMessage(
      `You've earned a 7-day free pass! ${result.referrerName} earns theirs when you post your first activity.`,
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.navTitle}>Redeem code</Text>
          <View style={styles.navBtn} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Got a code?</Text>
          <Text style={styles.subtitle}>
            Enter a referral or launch code to apply a free pass.
          </Text>

          <TextInput
            value={code}
            onChangeText={(t) => {
              setCode(t);
              if (status === 'error' || status === 'success') setStatus('idle');
            }}
            placeholder="JAMES7"
            placeholderTextColor={colors.text.faint}
            style={styles.input}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={16}
            editable={status !== 'checking' && status !== 'success'}
          />

          {message && (
            <View
              style={[
                styles.banner,
                status === 'success' ? styles.bannerSuccess : styles.bannerError,
              ]}
            >
              <Ionicons
                name={status === 'success' ? 'checkmark-circle' : 'alert-circle-outline'}
                size={18}
                color={status === 'success' ? colors.accent.green : colors.accent.red}
              />
              <Text
                style={[
                  styles.bannerText,
                  status === 'success' ? styles.bannerTextSuccess : styles.bannerTextError,
                ]}
              >
                {message}
              </Text>
            </View>
          )}

          <Pressable
            onPress={status === 'success' ? () => router.back() : redeem}
            disabled={status === 'checking' || code.trim().length === 0}
            style={({ pressed }) => [
              styles.primaryBtn,
              (status === 'checking' || code.trim().length === 0) &&
                styles.primaryBtnDisabled,
              pressed && styles.primaryBtnPressed,
            ]}
          >
            {status === 'checking' ? (
              <ActivityIndicator color={colors.accent.goldDark} />
            ) : (
              <Text
                style={[
                  styles.primaryBtnText,
                  code.trim().length === 0 && styles.primaryBtnTextDisabled,
                ]}
              >
                {status === 'success' ? 'Done' : 'Apply code'}
              </Text>
            )}
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
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
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
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.muted,
  },
  input: {
    height: 64,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    paddingHorizontal: spacing.lg,
    fontSize: 24,
    color: colors.text.primary,
    letterSpacing: 3,
    fontWeight: '400',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  bannerSuccess: {
    borderColor: colors.accent.green,
    backgroundColor: colors.accent.greenBg,
  },
  bannerError: {
    borderColor: colors.accent.red,
    backgroundColor: colors.accent.redBg,
  },
  bannerText: {
    ...typography.small,
    flex: 1,
    lineHeight: 18,
  },
  bannerTextSuccess: {
    color: colors.accent.green,
  },
  bannerTextError: {
    color: colors.accent.red,
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
