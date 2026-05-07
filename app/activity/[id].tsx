import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { colors, radius, spacing, typography } from '@/constants/colors';
import { type PlaceholderActivity, type PlaceholderGuest } from '@/constants/placeholderActivities';
import { venueMap } from '@/constants/venues';
import {
  cancelActivity,
  deleteActivity,
  getActivity,
  getMyJoinRequest,
  listJoinedGuests,
  requestToJoin,
  type JoinRequestStatus,
} from '@/lib/activitiesApi';
import { useAuth } from '@/stores/authStore';

type LocalSendState = 'idle' | 'sending';

export default function ActivityDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [activity, setActivity] = useState<PlaceholderActivity | null>(null);
  const [joinedGuests, setJoinedGuests] = useState<PlaceholderGuest[]>([]);
  const [myStatus, setMyStatus] = useState<JoinRequestStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendState, setSendState] = useState<LocalSendState>('idle');

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    const [a, guests, mine] = await Promise.all([
      getActivity(id),
      listJoinedGuests(id),
      getMyJoinRequest(id),
    ]);
    setActivity(a);
    setJoinedGuests(guests);
    setMyStatus(mine.exists ? mine.status ?? 'pending' : null);
    setLoading(false);
  }, [id]);

  // useFocusEffect (rather than useEffect) so the page also reloads when the
  // user returns from the edit modal, so saved changes appear immediately.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const requestJoin = async () => {
    if (sendState === 'sending' || myStatus || !id) return;
    setSendState('sending');
    try {
      await requestToJoin(id);
      setMyStatus('pending');
    } catch (err: any) {
      Alert.alert('Could not send request', err?.message ?? 'Please try again.');
    } finally {
      setSendState('idle');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NavBar onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.gold} />
        </View>
      </SafeAreaView>
    );
  }

  if (!activity) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NavBar onBack={() => router.back()} />
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>Activity not found</Text>
          <Text style={styles.missingBody}>It may have been cancelled or expired.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const venue = venueMap[activity.venue];
  const isHost = !!user && user.id === activity.host.id;
  const isCancelled = activity.status === 'cancelled';
  // dateIso is YYYY-MM-DD; compare against today's local YYYY-MM-DD so an
  // activity from earlier today still counts as "expired" once the date page
  // has flipped on the device.
  const todayIso = new Date().toISOString().slice(0, 10);
  const isExpired = activity.dateIso < todayIso;

  const askDelete = () => {
    if (!id) return;
    Alert.alert(
      'Delete this activity?',
      'It will be permanently removed, along with any messages from it.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteActivity(id);
              router.back();
            } catch (err: any) {
              Alert.alert('Could not delete', err?.message ?? 'Please try again.');
            }
          },
        },
      ],
    );
  };

  const showHostMenu = () => {
    if (!id) return;
    const goEdit = () => router.push(`/activity/edit/${id}`);
    const askCancel = () => {
      Alert.alert(
        'Cancel this activity?',
        'Anyone who joined will see it as cancelled. This cannot be undone.',
        [
          { text: 'Keep activity', style: 'cancel' },
          {
            text: 'Cancel activity',
            style: 'destructive',
            onPress: async () => {
              try {
                await cancelActivity(id);
                await load();
              } catch (err: any) {
                Alert.alert('Could not cancel', err?.message ?? 'Please try again.');
              }
            },
          },
        ],
      );
    };

    // Past or already-cancelled: only deletion makes sense.
    if (isCancelled || isExpired) {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Delete activity', 'Close'],
            destructiveButtonIndex: 0,
            cancelButtonIndex: 1,
            userInterfaceStyle: 'dark',
          },
          (idx) => {
            if (idx === 0) askDelete();
          },
        );
      } else {
        Alert.alert('Manage activity', undefined, [
          { text: 'Delete activity', style: 'destructive', onPress: askDelete },
          { text: 'Close', style: 'cancel' },
        ]);
      }
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Edit details', 'Cancel activity', 'Close'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
          userInterfaceStyle: 'dark',
        },
        (idx) => {
          if (idx === 0) goEdit();
          else if (idx === 1) askCancel();
        },
      );
    } else {
      Alert.alert('Manage activity', undefined, [
        { text: 'Edit details', onPress: goEdit },
        { text: 'Cancel activity', style: 'destructive', onPress: askCancel },
        { text: 'Close', style: 'cancel' },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NavBar
        onBack={() => router.back()}
        onMenu={isHost ? showHostMenu : undefined}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {isCancelled && (
          <View style={styles.cancelledBanner}>
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.accent.red}
            />
            <Text style={styles.cancelledText}>
              This activity has been cancelled.
            </Text>
          </View>
        )}

        <View style={styles.hero}>
          <View style={styles.venueBadge}>
            <Ionicons
              name={venue.icon as any}
              size={32}
              color={colors.accent.gold}
            />
          </View>
          <Text style={styles.kicker}>{venue.label.toUpperCase()}</Text>
          <Text style={styles.heroTitle}>{venue.description}</Text>
        </View>

        <View style={styles.card}>
          <MetaRow
            icon="business-outline"
            label="Hotel"
            value={activity.hotelName}
            sub={activity.hotelCity}
          />
          <Divider />
          <MetaRow
            icon="calendar-outline"
            label="When"
            value={activity.dateLabel}
            sub={`${activity.timeFrom} – ${activity.timeTo}`}
          />
        </View>

        <Text style={styles.sectionLabel}>HOST</Text>
        <View style={styles.hostCard}>
          <Pressable
            onPress={() => router.push(`/user/${activity.host.id}`)}
            hitSlop={6}
          >
            <Avatar
              uri={activity.host.avatarUri}
              initial={activity.host.initial}
              size={52}
              gold
            />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={styles.hostNameRow}>
              <Text style={styles.hostName}>
                {activity.host.firstName}
                {isHost && <Text style={styles.hostYou}> · You</Text>}
              </Text>
              <View style={styles.hostFlags}>
                {activity.host.languages.map((l) => (
                  <Text key={l.code} style={styles.flag}>
                    {l.flag}
                  </Text>
                ))}
              </View>
            </View>
            {activity.host.bio.length > 0 && (
              <Text style={styles.hostBio}>{activity.host.bio}</Text>
            )}
          </View>
        </View>

        {activity.note.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>NOTE</Text>
            <View style={styles.noteCard}>
              <Text style={styles.noteText}>{activity.note}</Text>
            </View>
          </>
        )}

        {joinedGuests.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>ALREADY JOINED</Text>
            <View style={styles.guestsRow}>
              {joinedGuests.map((g) => (
                <Pressable
                  key={g.id}
                  onPress={() => router.push(`/user/${g.id}`)}
                  style={styles.guest}
                  hitSlop={4}
                >
                  <Avatar uri={g.avatarUri} initial={g.initial} size={44} />
                  <Text style={styles.guestName}>{g.firstName}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <View style={styles.footer}>
        <FooterCta
          isHost={isHost}
          isCancelled={isCancelled}
          myStatus={myStatus}
          sending={sendState === 'sending'}
          hostName={activity.host.firstName}
          onPress={requestJoin}
        />
      </View>

    </SafeAreaView>
  );
}

function FooterCta({
  isHost,
  isCancelled,
  myStatus,
  sending,
  hostName,
  onPress,
}: {
  isHost: boolean;
  isCancelled: boolean;
  myStatus: JoinRequestStatus | null;
  sending: boolean;
  hostName: string;
  onPress: () => void;
}) {
  if (isCancelled) {
    return (
      <View style={styles.declinedBtn}>
        <Text style={styles.declinedText}>Activity cancelled</Text>
      </View>
    );
  }

  if (isHost) {
    return (
      <View style={styles.infoBtn}>
        <Ionicons name="star-outline" size={18} color={colors.accent.gold} />
        <Text style={styles.infoBtnText}>You're hosting this</Text>
      </View>
    );
  }

  if (myStatus === 'accepted') {
    return (
      <>
        <View style={styles.sentBtn}>
          <Ionicons name="checkmark-circle" size={20} color={colors.accent.green} />
          <Text style={styles.sentText}>You're going</Text>
        </View>
        <Text style={styles.sentHint}>
          Find your chat with {hostName} in Messages.
        </Text>
      </>
    );
  }

  if (myStatus === 'pending') {
    return (
      <>
        <View style={styles.pendingBtn}>
          <Ionicons name="hourglass-outline" size={18} color={colors.accent.gold} />
          <Text style={styles.pendingText}>Request pending</Text>
        </View>
        <Text style={styles.sentHint}>
          {hostName} will be notified. You'll see updates in Messages.
        </Text>
      </>
    );
  }

  if (myStatus === 'declined') {
    return (
      <View style={styles.declinedBtn}>
        <Text style={styles.declinedText}>Request declined</Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={sending}
      style={({ pressed }) => [
        styles.primaryBtn,
        pressed && !sending && styles.primaryBtnPressed,
      ]}
    >
      {sending ? (
        <ActivityIndicator color={colors.accent.goldDark} />
      ) : (
        <Text style={styles.primaryBtnText}>
          Request to join · {hostName}
        </Text>
      )}
    </Pressable>
  );
}

function NavBar({
  onBack,
  onMenu,
}: {
  onBack: () => void;
  onMenu?: () => void;
}) {
  return (
    <View style={styles.navBar}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.navBtn}>
        <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
      </Pressable>
      {onMenu ? (
        <Pressable onPress={onMenu} hitSlop={12} style={styles.navBtn}>
          <Ionicons
            name="ellipsis-horizontal"
            size={22}
            color={colors.text.primary}
          />
        </Pressable>
      ) : (
        <Pressable hitSlop={12} style={styles.navBtn}>
          <Ionicons
            name="share-outline"
            size={20}
            color={colors.text.secondary}
          />
        </Pressable>
      )}
    </View>
  );
}

function MetaRow({
  icon,
  label,
  value,
  sub,
  trailing,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.metaRow}>
      <View style={styles.metaIcon}>
        <Ionicons name={icon} size={18} color={colors.accent.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value}</Text>
        {sub && <Text style={styles.metaSub}>{sub}</Text>}
      </View>
      {trailing}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
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
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  venueBadge: {
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
  kicker: {
    ...typography.tiny,
    color: colors.accent.gold,
    letterSpacing: 3,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.text.primary,
    textAlign: 'center',
  },
  card: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
    padding: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  metaIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 2,
    marginBottom: 2,
  },
  metaValue: {
    ...typography.h3,
    color: colors.text.primary,
  },
  metaSub: {
    ...typography.small,
    color: colors.text.muted,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing.md,
  },
  sectionLabel: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 2,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  hostCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  hostNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  hostName: {
    ...typography.h3,
    color: colors.text.primary,
  },
  hostYou: {
    ...typography.small,
    color: colors.accent.gold,
    fontWeight: '500',
  },
  hostFlags: {
    flexDirection: 'row',
    gap: 4,
  },
  flag: {
    fontSize: 14,
  },
  hostBio: {
    ...typography.small,
    color: colors.text.muted,
    lineHeight: 19,
  },
  noteCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent.gold,
    backgroundColor: colors.bg.secondary,
  },
  noteText: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  guestsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  guest: {
    alignItems: 'center',
    gap: 4,
  },
  guestName: {
    ...typography.small,
    color: colors.text.muted,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.primary,
    gap: spacing.sm,
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
  sentBtn: {
    height: 54,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent.green,
    backgroundColor: colors.accent.greenBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  sentText: {
    color: colors.accent.green,
    fontSize: 16,
    fontWeight: '500',
  },
  sentHint: {
    ...typography.small,
    color: colors.text.muted,
    textAlign: 'center',
  },
  pendingBtn: {
    height: 54,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.gold,
    backgroundColor: colors.bg.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pendingText: {
    color: colors.accent.gold,
    fontSize: 16,
    fontWeight: '500',
  },
  declinedBtn: {
    height: 54,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declinedText: {
    ...typography.body,
    color: colors.text.muted,
  },
  infoBtn: {
    height: 54,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  infoBtnText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent.red,
    backgroundColor: colors.accent.redBg,
    marginTop: spacing.sm,
  },
  cancelledText: {
    ...typography.small,
    color: colors.accent.red,
    flex: 1,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  missingTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  missingBody: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: 'center',
  },
});
