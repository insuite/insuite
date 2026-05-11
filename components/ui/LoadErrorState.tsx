import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/colors';

interface LoadErrorStateProps {
  /**
   * Title line. Frame as a sentence about the failed load — e.g.
   * "Couldn't load activities." — so the screen is self-describing
   * even when the user lands on the error state directly.
   */
  title: string;
  /** Body line. Defaults to a generic connection-check hint. */
  body?: string;
  onRetry: () => void;
}

/**
 * Centred error block with a Retry pill. Used wherever a list/detail
 * screen has to distinguish "no data" from "load failed" — pair with
 * a try/catch around the API call and a separate `errored` state.
 */
export function LoadErrorState({
  title,
  body = 'Check your connection and try again.',
  onRetry,
}: LoadErrorStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons
        name="cloud-offline-outline"
        size={36}
        color={colors.text.faint}
        style={{ marginBottom: spacing.md }}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
        hitSlop={6}
      >
        <Text style={styles.btnText}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  btn: {
    minWidth: 96,
    paddingHorizontal: spacing.lg,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  btnText: {
    ...typography.small,
    color: colors.accent.gold,
    fontWeight: '600',
  },
});
