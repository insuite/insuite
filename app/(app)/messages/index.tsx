import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { colors, radius, spacing, typography } from '@/constants/colors';
import {
  acceptRequest,
  declineRequest,
  listConversations,
  listIncomingRequests,
  relativeTime,
  type ConversationSummary,
  type IncomingRequest,
} from '@/lib/messagesApi';
import { useAuth } from '@/stores/authStore';
import { notificationsStore } from '@/stores/notificationsStore';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);
  // Synchronous lock — `actingOn` updates async via setState, so two rapid
  // taps could both pass the disabled check before the next render. The ref
  // blocks immediately and prevents concurrent mutations.
  const inFlightRef = useRef(false);

  const load = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setRequests([]);
      setErrored(false);
      setLoading(false);
      return;
    }
    setErrored(false);
    try {
      const [convos, reqs] = await Promise.all([
        listConversations(user.id),
        listIncomingRequests(user.id),
      ]);
      setConversations(convos);
      setRequests(reqs);
      notificationsStore.set({
        pendingRequestsCount: reqs.length,
        unreadConversationsCount: convos.filter((c) => c.unread).length,
      });
    } catch (err: any) {
      console.warn('[messages] list failed', err?.message ?? err);
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onAccept = async (req: IncomingRequest) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setActingOn(req.id);
    try {
      await acceptRequest(req.id);
      await load();
    } catch (err: any) {
      Alert.alert('Could not accept', err?.message ?? 'Please try again.');
    } finally {
      inFlightRef.current = false;
      setActingOn(null);
    }
  };

  const onDecline = async (req: IncomingRequest) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setActingOn(req.id);
    try {
      await declineRequest(req.id);
      await load();
    } catch (err: any) {
      Alert.alert('Could not decline', err?.message ?? 'Please try again.');
    } finally {
      inFlightRef.current = false;
      setActingOn(null);
    }
  };

  const isEmpty = conversations.length === 0 && requests.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>MESSAGES</Text>
          <Text style={styles.title}>Conversations</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.gold} />
        </View>
      ) : errored ? (
        <LoadErrorState title="Couldn't load messages." onRetry={load} />
      ) : isEmpty ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons
              name="chatbubble-outline"
              size={28}
              color={colors.accent.gold}
            />
          </View>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyBody}>
            When someone joins your activity, your chat will live here.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accent.gold}
            />
          }
        >
          {requests.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>REQUESTS</Text>
              {requests.map((r, i) => (
                <RequestRow
                  key={r.id}
                  request={r}
                  acting={actingOn === r.id}
                  onAccept={() => onAccept(r)}
                  onDecline={() => onDecline(r)}
                  isFirst={i === 0}
                />
              ))}
            </>
          )}

          {conversations.length > 0 && (
            <>
              {requests.length > 0 && (
                <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
                  CHATS
                </Text>
              )}
              {conversations.map((c, i) => (
                <Pressable
                  key={c.id}
                  onPress={() => router.push(`/messages/${c.id}`)}
                  style={({ pressed }) => [
                    styles.row,
                    i === 0 && requests.length === 0 && styles.rowFirst,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Avatar
                    uri={c.other.avatarUri}
                    initial={c.other.initial}
                    size={48}
                  />
                  <View style={styles.rowMiddle}>
                    <View style={styles.rowTop}>
                      <Text style={styles.name}>{c.other.firstName}</Text>
                      {c.lastTime && (
                        <Text
                          style={[styles.time, c.unread && styles.timeUnread]}
                        >
                          {relativeTime(c.lastTime)}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.venue}>{c.venueContext}</Text>
                    <Text
                      style={[styles.preview, c.unread && styles.previewUnread]}
                      numberOfLines={1}
                    >
                      {c.lastMessage ?? 'Say hi 👋'}
                    </Text>
                  </View>
                  {c.unread ? (
                    <View style={styles.unreadDot} />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.text.ghost}
                    />
                  )}
                </Pressable>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function RequestRow({
  request,
  acting,
  onAccept,
  onDecline,
  isFirst,
}: {
  request: IncomingRequest;
  acting: boolean;
  onAccept: () => void;
  onDecline: () => void;
  isFirst: boolean;
}) {
  return (
    <View style={[styles.requestCard, isFirst && { marginTop: 0 }]}>
      <View style={styles.requestTop}>
        <Avatar
          uri={request.requester.avatarUri}
          initial={request.requester.initial}
          size={44}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.requestName}>
            {request.requester.firstName} wants to join
          </Text>
          <Text style={styles.requestVenue}>{request.venueContext}</Text>
        </View>
      </View>
      <View style={styles.requestActions}>
        <Pressable
          onPress={onDecline}
          disabled={acting}
          style={({ pressed }) => [
            styles.declineBtn,
            pressed && !acting && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.declineText}>Decline</Text>
        </Pressable>
        <Pressable
          onPress={onAccept}
          disabled={acting}
          style={({ pressed }) => [
            styles.acceptBtn,
            pressed && !acting && { opacity: 0.85 },
          ]}
        >
          {acting ? (
            <ActivityIndicator color={colors.accent.goldDark} />
          ) : (
            <Text style={styles.acceptText}>Accept</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  kicker: {
    ...typography.tiny,
    color: colors.accent.gold,
    letterSpacing: 3,
    marginBottom: 4,
  },
  title: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    ...typography.tiny,
    color: colors.text.faint,
    letterSpacing: 2,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  requestCard: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.gold,
    backgroundColor: colors.bg.card,
    gap: spacing.md,
  },
  requestTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  requestName: {
    ...typography.h3,
    color: colors.text.primary,
  },
  requestVenue: {
    ...typography.small,
    color: colors.accent.gold,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  declineBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  acceptBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    color: colors.accent.goldDark,
    fontSize: 15,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  rowMiddle: {
    flex: 1,
    gap: 2,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    ...typography.h3,
    color: colors.text.primary,
  },
  time: {
    ...typography.small,
    color: colors.text.faint,
  },
  timeUnread: {
    color: colors.accent.gold,
    fontWeight: '600',
  },
  venue: {
    ...typography.small,
    color: colors.accent.gold,
    letterSpacing: 0.3,
  },
  preview: {
    ...typography.small,
    color: colors.text.muted,
    marginTop: 2,
  },
  previewUnread: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent.gold,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  emptyBody: {
    ...typography.body,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
