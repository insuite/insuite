import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/constants/colors';
import {
  buyPass,
  fetchPassProducts,
  PASS_DURATION_DAYS,
  PASS_TYPE_FOR_DB,
  subscribePurchaseUpdates,
  type PassProductId,
} from '@/lib/iap';
import { getActivePass, insertPass, type Pass } from '@/lib/passesApi';
import { useAuth } from '@/stores/authStore';

interface PlanDisplay {
  id: PassProductId;
  days: number;
  fallbackPrice: string;
  perDay: string;
  savePct?: number;
  badge?: string;
}

const PLANS: PlanDisplay[] = [
  { id: 'com.insuite.invite.pass7d', days: 7, fallbackPrice: '$1.99', perDay: '$0.28' },
  { id: 'com.insuite.invite.pass14d', days: 14, fallbackPrice: '$2.99', perDay: '$0.21', savePct: 25, badge: 'MOST POPULAR' },
  { id: 'com.insuite.invite.pass30d', days: 30, fallbackPrice: '$4.99', perDay: '$0.17', savePct: 39, badge: 'BEST VALUE' },
];

export default function PlansScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [prices, setPrices] = useState<Record<string, string>>({});
  const [activePass, setActivePass] = useState<Pass | null>(null);
  const [purchasing, setPurchasing] = useState<PassProductId | null>(null);

  // Fetch the user's active pass on focus.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!user) return;
        const pass = await getActivePass(user.id);
        if (cancelled) return;
        setActivePass(pass);
      })();
      return () => {
        cancelled = true;
      };
    }, [user]),
  );

  // Load App Store products + subscribe to purchase events.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const products = await fetchPassProducts();
      if (cancelled) return;
      const map: Record<string, string> = {};
      for (const p of products) {
        map[p.id] = p.displayPrice ?? '';
      }
      setPrices(map);
    })();

    const unsubscribe = subscribePurchaseUpdates({
      onPurchase: async (purchase) => {
        const productId = purchase.productId as PassProductId;
        const dbType = PASS_TYPE_FOR_DB[productId];
        if (!dbType) {
          console.warn('[plans] unknown product', productId);
          return;
        }
        try {
          await insertPass(dbType, purchase.transactionId);
          if (user) {
            const pass = await getActivePass(user.id);
            if (!cancelled) setActivePass(pass);
          }
          Alert.alert(
            'Pass activated',
            `You're set for ${PASS_DURATION_DAYS[productId]} days. Post away.`,
          );
        } catch (err: any) {
          Alert.alert('Saved purchase failed', err?.message ?? 'Please try again.');
        } finally {
          if (!cancelled) setPurchasing(null);
        }
      },
      onError: (err) => {
        if (!cancelled) setPurchasing(null);
        if (err.code === 'E_USER_CANCELLED') return;
        Alert.alert('Purchase failed', err.message ?? 'Please try again.');
      },
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);

  const onBuy = async (plan: PlanDisplay) => {
    if (purchasing) return;
    setPurchasing(plan.id);
    try {
      await buyPass(plan.id);
    } catch (err: any) {
      setPurchasing(null);
      Alert.alert('Could not start purchase', err?.message ?? 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.navTitle}>Plans & pricing</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <StatusCard activePass={activePass} />

        {!activePass && (
          <>
            <Text style={styles.sectionLabel}>WHAT YOU GET</Text>
            <View style={styles.perksCard}>
              <Perk text="Unlimited posts" />
              <Perk text="Post before check-in" />
              <Perk text="Priority in Discover" />
              <Perk text="Pause or resume anytime" />
            </View>

            <Text style={styles.sectionLabel}>CHOOSE YOUR PASS</Text>
            <View style={styles.plansList}>
              {PLANS.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  price={prices[plan.id] ?? plan.fallbackPrice}
                  isPurchasing={purchasing === plan.id}
                  onPress={() => onBuy(plan)}
                />
              ))}
            </View>

            <Text style={styles.disclaimer}>
              One-time purchase via Apple · Automatically expires · No auto-renewal
            </Text>
          </>
        )}

        <Text style={styles.sectionLabel}>OR EARN IT FREE</Text>
        <Pressable
          onPress={() => router.push('/plans/referral')}
          style={({ pressed }) => [styles.earnCard, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.earnIcon}>
            <Ionicons name="gift-outline" size={20} color={colors.accent.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.earnTitle}>Invite a friend</Text>
            <Text style={styles.earnBody}>
              Get 7 days free when a friend posts their first activity.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.text.ghost} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/plans/redeem')}
          style={({ pressed }) => [styles.earnCard, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.earnIcon}>
            <Ionicons name="ticket-outline" size={20} color={colors.accent.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.earnTitle}>Redeem a code</Text>
            <Text style={styles.earnBody}>
              Have a referral or launch code? Apply it here.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.text.ghost} />
        </Pressable>

        <Pressable onPress={restorePlaceholder} style={styles.restoreLink} hitSlop={6}>
          <Text style={styles.restoreLinkText}>Restore purchases</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function restorePlaceholder() {
  // react-native-iap delivers historic purchases via the same purchaseUpdated
  // listener after calling getAvailablePurchases or simply re-initializing the
  // connection. For consumables (our pass tiers) restore is mainly to recover
  // a recently-completed transaction that didn't finish. Leaving as a stub
  // until we hit an actual case where users need this.
  Alert.alert(
    'Restore purchases',
    'Consumable passes are auto-applied at purchase. If a recent purchase is missing, sign out and back in to refresh.',
  );
}

function StatusCard({ activePass }: { activePass: Pass | null }) {
  if (activePass) {
    return (
      <View style={[styles.statusCard, styles.statusCardActive]}>
        <Text style={styles.statusLabel}>ACTIVE PASS</Text>
        <Text style={styles.statusValue}>
          {activePass.daysRemaining}{' '}
          <Text style={styles.statusUnit}>days remaining</Text>
        </Text>
        <Text style={styles.statusSub}>
          Unlimited posts until{' '}
          {new Date(activePass.expiresAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
          .
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.statusCard}>
      <Text style={styles.statusLabel}>CURRENT</Text>
      <Text style={styles.statusValue}>Free account</Text>
      <Text style={styles.statusSub}>
        Browse, join, and message matched guests. First post is on the house.
      </Text>
    </View>
  );
}

function Perk({ text }: { text: string }) {
  return (
    <View style={styles.perk}>
      <Ionicons name="checkmark" size={16} color={colors.accent.gold} />
      <Text style={styles.perkText}>{text}</Text>
    </View>
  );
}

function PlanCard({
  plan,
  price,
  isPurchasing,
  onPress,
}: {
  plan: PlanDisplay;
  price: string;
  isPurchasing: boolean;
  onPress: () => void;
}) {
  const isFeatured = plan.badge === 'MOST POPULAR';
  return (
    <View
      style={[
        styles.planCard,
        isFeatured && styles.planCardFeatured,
      ]}
    >
      {plan.badge && (
        <View
          style={[
            styles.planBadge,
            !isFeatured && styles.planBadgeMuted,
          ]}
        >
          <Text
            style={[
              styles.planBadgeText,
              !isFeatured && styles.planBadgeTextMuted,
            ]}
          >
            {plan.badge}
          </Text>
        </View>
      )}

      <View style={styles.planRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.planDuration}>{plan.days} days</Text>
          <Text style={styles.planPerDay}>
            {plan.perDay} per day
            {plan.savePct ? <Text style={styles.savings}> · save {plan.savePct}%</Text> : null}
          </Text>
        </View>
        <Text style={styles.planPrice}>{price}</Text>
      </View>

      <Pressable
        onPress={onPress}
        disabled={isPurchasing}
        style={({ pressed }) => [
          styles.buyBtn,
          !isFeatured && styles.buyBtnGhost,
          pressed && !isPurchasing && { opacity: 0.85 },
        ]}
      >
        {isPurchasing ? (
          <ActivityIndicator
            color={isFeatured ? colors.accent.goldDark : colors.accent.gold}
          />
        ) : (
          <Text
            style={[
              styles.buyBtnText,
              !isFeatured && styles.buyBtnTextGhost,
            ]}
          >
            Get {plan.days}-day pass
          </Text>
        )}
      </Pressable>
    </View>
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
  scroll: {
    padding: spacing.xl,
    gap: spacing.sm,
  },
  statusCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  statusCardActive: {
    borderColor: colors.border.gold,
    backgroundColor: colors.border.active,
  },
  statusLabel: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  statusValue: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  statusUnit: {
    ...typography.body,
    color: colors.text.muted,
    fontWeight: '400',
  },
  statusSub: {
    ...typography.small,
    color: colors.text.muted,
    lineHeight: 19,
  },
  sectionLabel: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 2,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  perksCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
    gap: spacing.xs + 2,
  },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  perkText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  plansList: {
    gap: spacing.sm,
  },
  planCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
    gap: spacing.md,
    position: 'relative',
  },
  planCardFeatured: {
    borderColor: colors.border.gold,
    borderWidth: 1.5,
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.accent.gold,
  },
  planBadgeMuted: {
    backgroundColor: colors.bg.tertiary,
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  planBadgeText: {
    ...typography.tiny,
    color: colors.accent.goldDark,
    fontWeight: '700',
    letterSpacing: 1,
  },
  planBadgeTextMuted: {
    color: colors.accent.gold,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planDuration: {
    ...typography.h2,
    color: colors.text.primary,
  },
  planPerDay: {
    ...typography.small,
    color: colors.text.muted,
    marginTop: 2,
  },
  savings: {
    color: colors.accent.green,
    fontWeight: '600',
  },
  planPrice: {
    ...typography.h2,
    color: colors.accent.gold,
  },
  buyBtn: {
    height: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.gold,
  },
  buyBtnText: {
    color: colors.accent.goldDark,
    fontSize: 15,
    fontWeight: '600',
  },
  buyBtnTextGhost: {
    color: colors.accent.gold,
  },
  disclaimer: {
    ...typography.tiny,
    color: colors.text.faint,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  earnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  earnIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earnTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  earnBody: {
    ...typography.small,
    color: colors.text.muted,
    marginTop: 2,
    lineHeight: 18,
  },
  restoreLink: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  restoreLinkText: {
    ...typography.small,
    color: colors.text.muted,
    textDecorationLine: 'underline',
  },
});
