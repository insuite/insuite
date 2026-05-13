import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@/constants/colors';
import {
  listHotelsForAdmin,
  listPendingHotelRequests,
  listPendingReports,
} from '@/lib/adminApi';
import { useProfile } from '@/stores/profileStore';

import { AdminGate } from '@/components/admin/AdminGate';

export default function AdminLanding() {
  const router = useRouter();
  const profile = useProfile();
  const [hotelCount, setHotelCount] = useState<number | null>(null);
  const [pendingRequestCount, setPendingRequestCount] = useState<number | null>(
    null,
  );
  const [pendingReportCount, setPendingReportCount] = useState<number | null>(
    null,
  );

  // Refresh counts every time the screen comes back into focus — covers
  // returning from /admin/hotels (count changed via add/delete),
  // /admin/requests (pending dropped after approve/reject), and
  // /admin/reports (pending dropped after dismiss/action).
  useFocusEffect(
    useCallback(() => {
      if (!profile.isAdmin) return;
      let cancelled = false;
      void Promise.all([
        listHotelsForAdmin(),
        listPendingHotelRequests(),
        listPendingReports(),
      ]).then(([hotels, requests, reports]) => {
        if (cancelled) return;
        setHotelCount(hotels.length);
        setPendingRequestCount(requests.length);
        setPendingReportCount(reports.length);
      });
      return () => {
        cancelled = true;
      };
    }, [profile.isAdmin]),
  );

  return (
    <AdminGate>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.navBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.navBtn}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.text.primary}
            />
          </Pressable>
          <Text style={styles.navTitle}>Admin</Text>
          <View style={styles.navBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.helper}>
            Manage the hotels catalog and review user-submitted requests.
            Changes here go straight to production.
          </Text>

          <MenuCard
            icon="business-outline"
            label="Hotels"
            sub={hotelCount === null ? 'Loading…' : `${hotelCount} in catalog`}
            onPress={() => router.push('/admin/hotels')}
          />
          <MenuCard
            icon="mail-unread-outline"
            label="Hotel requests"
            sub={
              pendingRequestCount === null
                ? 'Loading…'
                : pendingRequestCount === 0
                  ? 'No pending requests'
                  : `${pendingRequestCount} pending`
            }
            highlight={pendingRequestCount !== null && pendingRequestCount > 0}
            onPress={() => router.push('/admin/requests')}
          />
          <MenuCard
            icon="flag-outline"
            label="Reports"
            sub={
              pendingReportCount === null
                ? 'Loading…'
                : pendingReportCount === 0
                  ? 'No pending reports'
                  : `${pendingReportCount} pending`
            }
            highlight={pendingReportCount !== null && pendingReportCount > 0}
            onPress={() => router.push('/admin/reports')}
          />
        </ScrollView>
      </SafeAreaView>
    </AdminGate>
  );
}

function MenuCard({
  icon,
  label,
  sub,
  highlight,
  onPress,
}: {
  icon: any;
  label: string;
  sub: string;
  highlight?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.cardIcon}>
        <Ionicons name={icon} size={20} color={colors.accent.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text
          style={[styles.cardSub, highlight && { color: colors.accent.gold }]}
        >
          {sub}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text.ghost} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navTitle: { ...typography.h3, color: colors.text.primary },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  helper: {
    ...typography.small,
    color: colors.text.muted,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: { ...typography.body, color: colors.text.primary, fontWeight: '500' },
  cardSub: { ...typography.small, color: colors.text.muted, marginTop: 2 },
});
