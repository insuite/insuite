import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/colors';

import { Avatar } from './Avatar';

interface AvatarLightboxProps {
  visible: boolean;
  onClose: () => void;
  uri?: string | null;
  initial: string;
  name: string;
  subtitle?: ReactNode;
  size?: number;
}

/**
 * Full-screen, dimmed-backdrop preview of a person's avatar.
 * Used wherever a tappable avatar should expand to a hero view —
 * Activity Detail host card, Chat thread NavBar, etc.
 */
export function AvatarLightbox({
  visible,
  onClose,
  uri,
  initial,
  name,
  subtitle,
  size = 260,
}: AvatarLightboxProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => { /* swallow */ }}>
          <Avatar uri={uri} initial={initial} size={size} gold />
          <Text style={styles.name}>{name}</Text>
          {subtitle && <View style={styles.subtitleWrap}>{subtitle}</View>}
        </Pressable>

        <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
          <Ionicons name="close" size={22} color={colors.text.primary} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 4, 3, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    color: colors.text.primary,
    fontSize: 26,
    fontWeight: '300',
    letterSpacing: 0.3,
    marginTop: spacing.lg,
  },
  subtitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  close: {
    position: 'absolute',
    top: spacing.xxl + spacing.lg,
    right: spacing.xl,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
