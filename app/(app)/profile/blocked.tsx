import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { colors, radius, spacing, typography } from '@/constants/colors';
import {
  listBlockedUsers,
  unblockUser,
  type BlockedUser,
} from '@/lib/moderationApi';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      listBlockedUsers().then((list) => {
        if (cancelled) return;
        setUsers(list);
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const askUnblock = (target: BlockedUser) => {
    Alert.alert(
      `Unblock ${target.firstName}?`,
      'They will be able to see your activities again. You can re-block them at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            setUnblockingId(target.id);
            try {
              await unblockUser(target.id);
              setUsers((prev) => prev.filter((u) => u.id !== target.id));
            } catch (err: any) {
              Alert.alert('Could not unblock', err?.message ?? 'Please try again.');
            } finally {
              setUnblockingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Blocked users</Text>
        <View style={styles.navBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.gold} />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="ban-outline"
            size={36}
            color={colors.text.faint}
            style={{ marginBottom: spacing.md }}
          />
          <Text style={styles.emptyTitle}>No one's blocked.</Text>
          <Text style={styles.emptyBody}>
            When you block someone, they'll appear here. You can unblock at any
            time.
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const initial = (item.firstName[0] ?? '?').toUpperCase();
            const isBusy = unblockingId === item.id;
            return (
              <View style={styles.row}>
                <Avatar uri={item.avatarUri} initial={initial} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.firstName}</Text>
                  <Text style={styles.sub}>
                    Blocked {formatRelative(item.blockedAt)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => askUnblock(item)}
                  disabled={isBusy}
                  style={({ pressed }) => [
                    styles.unblockBtn,
                    pressed && !isBusy && { opacity: 0.7 },
                  ]}
                  hitSlop={6}
                >
                  {isBusy ? (
                    <ActivityIndicator color={colors.accent.gold} size="small" />
                  ) : (
                    <Text style={styles.unblockText}>Unblock</Text>
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMo = Math.floor(diffDay / 30);
  if (diffMo < 12) return `${diffMo}mo ago`;
  return `${Math.floor(diffMo / 12)}y ago`;
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptyBody: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  name: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  sub: {
    ...typography.small,
    color: colors.text.muted,
    marginTop: 2,
  },
  unblockBtn: {
    minWidth: 84,
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblockText: {
    ...typography.small,
    color: colors.accent.gold,
    fontWeight: '600',
  },
});
