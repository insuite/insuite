import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/colors';

interface PushPrimingSheetProps {
  visible: boolean;
  busy?: boolean;
  onAllow: () => void;
  onDecline: () => void;
}

/**
 * Pre-permission priming sheet shown once on first reach of Discover after
 * onboarding. Explains why we want notifications BEFORE Apple's system dialog
 * appears — Apple HIG recommends this so users don't reflexively tap "Don't
 * Allow" without understanding the value. Once dismissed (either tap), we
 * stamp an AsyncStorage flag so it never reappears.
 */
export function PushPrimingSheet({
  visible,
  busy,
  onAllow,
  onDecline,
}: PushPrimingSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onDecline}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.iconWrap}>
            <Ionicons
              name="notifications-outline"
              size={28}
              color={colors.accent.gold}
            />
          </View>

          <Text style={styles.title}>Stay in the loop</Text>
          <Text style={styles.body}>
            We&apos;ll ping you when:
          </Text>

          <View style={styles.bulletList}>
            <Bullet text="Someone asks to join your activity" />
            <Bullet text="A host accepts your request" />
            <Bullet text="A guest sends you a message" />
          </View>

          <Text style={styles.footnote}>
            Nothing else. You can turn this off any time in iOS Settings.
          </Text>

          <Pressable
            onPress={onAllow}
            disabled={busy}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && !busy && { opacity: 0.85 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.accent.goldDark} />
            ) : (
              <Text style={styles.primaryBtnText}>Allow notifications</Text>
            )}
          </Pressable>

          <Pressable
            onPress={onDecline}
            disabled={busy}
            style={({ pressed }) => [
              styles.declineBtn,
              pressed && !busy && { opacity: 0.6 },
            ]}
            hitSlop={6}
          >
            <Text style={styles.declineText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <Ionicons name="checkmark" size={16} color={colors.accent.gold} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.gold,
    backgroundColor: colors.bg.card,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border.gold,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '400',
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  bulletList: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bulletText: {
    ...typography.body,
    color: colors.text.secondary,
    flex: 1,
  },
  footnote: {
    ...typography.small,
    color: colors.text.faint,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
    maxWidth: 280,
  },
  primaryBtn: {
    alignSelf: 'stretch',
    height: 50,
    borderRadius: radius.lg,
    backgroundColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  primaryBtnText: {
    color: colors.accent.goldDark,
    fontSize: 16,
    fontWeight: '600',
  },
  declineBtn: {
    paddingVertical: spacing.sm,
  },
  declineText: {
    ...typography.body,
    color: colors.text.muted,
  },
});
