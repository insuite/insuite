import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useCallback, useRef, useState } from 'react';
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

import { AdminGate } from '@/components/admin/AdminGate';
import { Avatar } from '@/components/ui/Avatar';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { colors, radius, spacing, typography } from '@/constants/colors';
import {
  adminDeleteMessage,
  getAdminConversation,
  listAdminMessages,
  type AdminChatContext,
  type AdminChatMessage,
} from '@/lib/adminApi';

/**
 * Admin chat viewer.
 *
 * Distinct from the consumer chat thread at /messages/[id]:
 *   - Loads via the admin RLS path, so it works even when the admin
 *     isn't a participant in the conversation.
 *   - No input bar — admin can't impersonate either party.
 *   - Long-press any message → Delete (admin). Other admin actions
 *     (block participant, etc.) live on /user/[id]; tap an avatar to
 *     jump there.
 *   - When opened from /admin/reports the route includes
 *     ?reportedMessageId=<id>; that bubble gets a gold ring so the
 *     admin can see exactly which message the report flagged.
 */
export default function AdminChatScreen() {
  const router = useRouter();
  const { id, reportedMessageId } = useLocalSearchParams<{
    id: string;
    reportedMessageId?: string;
  }>();

  const [context, setContext] = useState<AdminChatContext | null>(null);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const messageOffsets = useRef<Map<string, number>>(new Map());

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setErrored(false);
    setLoading(true);
    try {
      const [ctx, msgs] = await Promise.all([
        getAdminConversation(id),
        listAdminMessages(id),
      ]);
      setContext(ctx);
      setMessages(msgs);
    } catch (err: any) {
      console.warn('[admin-chat] load failed', err?.message ?? err);
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load, retryNonce]),
  );

  // After messages render, jump to the reported one (if any). Falls back
  // to bottom of the thread for general "open conversation" flow.
  const onContentSizeChange = () => {
    if (!messages.length) return;
    if (reportedMessageId) {
      const y = messageOffsets.current.get(reportedMessageId);
      if (typeof y === 'number') {
        scrollRef.current?.scrollTo({
          y: Math.max(0, y - 120),
          animated: false,
        });
        return;
      }
    }
    scrollRef.current?.scrollToEnd({ animated: false });
  };

  const onLongPressMessage = (msg: AdminChatMessage) => {
    const askDelete = () => {
      Alert.alert(
        'Delete this message (admin)?',
        'It will be permanently removed from the conversation. Both participants will see it gone on next refresh.',
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await adminDeleteMessage(msg.id);
                setMessages((prev) => prev.filter((m) => m.id !== msg.id));
              } catch (err: any) {
                Alert.alert(
                  'Could not delete',
                  err?.message ?? 'Please try again.',
                );
              }
            },
          },
        ],
      );
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Delete message (admin)', 'Cancel'],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
          userInterfaceStyle: 'dark',
        },
        (i) => {
          if (i === 0) askDelete();
        },
      );
    } else {
      Alert.alert('Message', undefined, [
        {
          text: 'Delete message (admin)',
          style: 'destructive',
          onPress: askDelete,
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <AdminGate>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <NavBar
          onBack={() => router.back()}
          title={
            context
              ? `${context.participantA.firstName} ↔ ${context.participantB.firstName}`
              : 'Loading…'
          }
          subtitle={context?.venueContext ?? undefined}
        />

        <View style={styles.adminBanner}>
          <Ionicons
            name="shield-checkmark"
            size={14}
            color={colors.accent.gold}
          />
          <Text style={styles.adminBannerText}>
            Admin moderation view · long-press a message to delete
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent.gold} />
          </View>
        ) : errored ? (
          <LoadErrorState
            title="Couldn't load this conversation."
            onRetry={() => setRetryNonce((n) => n + 1)}
          />
        ) : !context ? (
          <View style={styles.center}>
            <Text style={styles.missingText}>Conversation not found.</Text>
          </View>
        ) : (
          <>
            <ParticipantsBar
              context={context}
              onAvatarPress={(uid) => router.push(`/user/${uid}`)}
            />

            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.messages}
              onContentSizeChange={onContentSizeChange}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyChat}>
                  <Text style={styles.emptyChatText}>No messages yet.</Text>
                </View>
              ) : (
                messages.map((m, i) => {
                  const isFromA = m.senderId === context.participantA.id;
                  const sender = isFromA
                    ? context.participantA
                    : context.participantB;
                  const showHeader =
                    i === 0 || messages[i - 1].senderId !== m.senderId;
                  const isReported = m.id === reportedMessageId;
                  return (
                    <View
                      key={m.id}
                      style={{ width: '100%' }}
                      onLayout={(e) => {
                        messageOffsets.current.set(m.id, e.nativeEvent.layout.y);
                      }}
                    >
                      {showHeader && (
                        <Text
                          style={[
                            styles.senderLabel,
                            isFromA ? styles.alignLeft : styles.alignRight,
                          ]}
                        >
                          {sender.firstName} · {formatBubbleTime(m.createdAt)}
                        </Text>
                      )}
                      <Pressable
                        onLongPress={() => onLongPressMessage(m)}
                        delayLongPress={350}
                        style={({ pressed }) => [
                          styles.bubble,
                          isFromA ? styles.bubbleLeft : styles.bubbleRight,
                          isReported && styles.bubbleReported,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={styles.bubbleText}>{m.text}</Text>
                      </Pressable>
                      {isReported && (
                        <Text
                          style={[
                            styles.reportedTag,
                            isFromA ? styles.alignLeft : styles.alignRight,
                          ]}
                        >
                          flagged in report
                        </Text>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </AdminGate>
  );
}

function ParticipantsBar({
  context,
  onAvatarPress,
}: {
  context: AdminChatContext;
  onAvatarPress: (userId: string) => void;
}) {
  return (
    <View style={styles.partBar}>
      {[context.participantA, context.participantB].map((p, idx) => (
        <Pressable
          key={p.id}
          onPress={() => onAvatarPress(p.id)}
          style={styles.partChip}
          hitSlop={6}
        >
          <Avatar uri={p.avatarUri} initial={p.initial} size={28} />
          <Text style={styles.partName}>{p.firstName}</Text>
          {idx === 0 && (
            <Ionicons
              name="swap-horizontal"
              size={14}
              color={colors.text.faint}
              style={{ marginHorizontal: 4 }}
            />
          )}
        </Pressable>
      ))}
    </View>
  );
}

function NavBar({
  onBack,
  title,
  subtitle,
}: {
  onBack: () => void;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.navBar}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.navBtn}>
        <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
      </Pressable>
      <View style={styles.navCenter}>
        <Text style={styles.navTitle} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={styles.navContext} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.navBtn} />
    </View>
  );
}

function formatBubbleTime(iso: string): string {
  const d = new Date(iso);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
  const date = d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });
  return `${date} ${time}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  navTitle: { ...typography.h3, color: colors.text.primary },
  navContext: {
    ...typography.tiny,
    color: colors.accent.gold,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.tertiary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  adminBannerText: {
    ...typography.tiny,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  partBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  partChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partName: {
    ...typography.small,
    color: colors.text.primary,
    fontWeight: '500',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  missingText: { ...typography.body, color: colors.text.muted },
  messages: {
    padding: spacing.lg,
    gap: spacing.xs,
    flexGrow: 1,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyChatText: { ...typography.body, color: colors.text.muted },
  senderLabel: {
    ...typography.tiny,
    color: colors.text.faint,
    marginTop: spacing.sm,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  alignLeft: { textAlign: 'left' },
  alignRight: { textAlign: 'right' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    marginBottom: 4,
    borderWidth: 1,
  },
  bubbleLeft: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bg.card,
    borderColor: colors.border.subtle,
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    alignSelf: 'flex-end',
    backgroundColor: colors.bg.secondary,
    borderColor: colors.border.default,
    borderBottomRightRadius: 4,
  },
  bubbleReported: {
    borderColor: colors.accent.gold,
    borderWidth: 1.5,
  },
  bubbleText: {
    ...typography.body,
    color: colors.text.primary,
    lineHeight: 20,
  },
  reportedTag: {
    ...typography.tiny,
    color: colors.accent.gold,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
});
