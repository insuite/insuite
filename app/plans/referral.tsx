import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/constants/colors';
import { listMyReferrals, type MyReferral } from '@/lib/referralsApi';
import { useAuth } from '@/stores/authStore';
import { useProfile } from '@/stores/profileStore';

export default function ReferralScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const profile = useProfile();
  const code = profile.referralCode;

  const [referrals, setReferrals] = useState<MyReferral[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setReferrals([]);
      setLoading(false);
      return;
    }
    const list = await listMyReferrals(user.id);
    setReferrals(list);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const rewardsEarned = referrals.filter((r) => r.rewarded).length;

  const onShare = async () => {
    if (!code) return;
    // Plain-text message with the code highlighted + a scheme deep link for
    // friends who already have InSuite installed. Once we have a hosted
    // domain we can swap this for a universal link that also pitches install
    // to non-users.
    const message = [
      `🥂 Want company at your hotel?`,
      ``,
      `Join me on InSuite — meet fellow solo guests for breakfast, the gym, lounge, or dinner.`,
      ``,
      `Use code  ${code}  for a free 7-day pass.`,
      ``,
      `insuite2://redeem/${code}`,
    ].join('\n');
    try {
      await Share.share({ message });
    } catch {
      // ignore — user-cancelled share
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Invite friends</Text>
        <View style={styles.navBtn} />
      </View>

      <View style={styles.hero}>
        <View style={styles.giftWrap}>
          <Ionicons name="gift-outline" size={32} color={colors.accent.gold} />
        </View>
        <Text style={styles.heroTitle}>Give 7 days,{'\n'}get 7 days</Text>
        <Text style={styles.heroSub}>
          Share your code. When a friend posts their first activity, we credit you
          a free 7-day pass.
        </Text>
      </View>

      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>YOUR CODE</Text>
        <Text style={styles.codeValue}>{code}</Text>
        <Pressable onPress={onShare} style={styles.shareBtn}>
          <Ionicons
            name="share-social-outline"
            size={18}
            color={colors.accent.goldDark}
          />
          <Text style={styles.shareText}>Share code</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <Stat value={referrals.length} label="Invited" />
        <Stat value={rewardsEarned} label="Rewarded" />
        <Stat value={rewardsEarned * 7} label="Free days" />
      </View>

      <Text style={styles.sectionLabel}>REFERRED FRIENDS</Text>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent.gold} />
        </View>
      ) : referrals.length === 0 ? (
        <Text style={styles.emptyText}>
          No invites yet — share your code to get started.
        </Text>
      ) : (
        referrals.map((r, i) => (
          <View
            key={r.id}
            style={[styles.refRow, i === 0 && styles.refRowFirst]}
          >
            <View style={styles.refAvatar}>
              <Text style={styles.refInitial}>
                {(r.referredFirstName[0] ?? '?').toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.refName}>{r.referredFirstName}</Text>
              <Text style={styles.refStatus}>
                {r.rewarded
                  ? 'Posted their first activity'
                  : 'Joined, not yet posted'}
              </Text>
            </View>
            {r.rewarded ? (
              <View style={styles.rewardedBadge}>
                <Ionicons name="checkmark" size={14} color={colors.accent.green} />
                <Text style={styles.rewardedText}>+7 days</Text>
              </View>
            ) : (
              <Text style={styles.pendingText}>Pending</Text>
            )}
          </View>
        ))
      )}
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    paddingHorizontal: spacing.xl,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginHorizontal: -spacing.md,
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
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  giftWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: colors.border.gold,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    color: colors.text.primary,
    fontSize: 28,
    fontWeight: '300',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 34,
  },
  heroSub: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 300,
  },
  codeCard: {
    marginTop: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.gold,
    backgroundColor: colors.bg.card,
    alignItems: 'center',
    gap: spacing.md,
  },
  codeLabel: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 2,
  },
  codeValue: {
    color: colors.accent.gold,
    fontSize: 36,
    fontWeight: '400',
    letterSpacing: 6,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 46,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.accent.gold,
  },
  shareText: {
    color: colors.accent.goldDark,
    fontSize: 15,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
    overflow: 'hidden',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border.subtle,
  },
  statValue: {
    ...typography.h2,
    color: colors.accent.gold,
  },
  statLabel: {
    ...typography.tiny,
    color: colors.text.muted,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  sectionLabel: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 2,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  refRowFirst: {
    borderTopWidth: 0,
  },
  refAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refInitial: {
    color: colors.accent.gold,
    fontSize: 16,
  },
  refName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  refStatus: {
    ...typography.small,
    color: colors.text.muted,
    marginTop: 2,
  },
  rewardedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.greenBg,
  },
  rewardedText: {
    ...typography.tiny,
    color: colors.accent.green,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  pendingText: {
    ...typography.small,
    color: colors.text.faint,
    fontStyle: 'italic',
  },
  loadingWrap: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.text.muted,
    paddingVertical: spacing.md,
  },
});
