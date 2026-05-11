import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReportSheet } from '@/components/moderation/ReportSheet';
import { Avatar } from '@/components/ui/Avatar';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { colors, radius, spacing, typography } from '@/constants/colors';
import {
  getChatContext,
  listMessages,
  markConversationRead,
  sendMessage,
  subscribeToMessages,
  type ChatContext,
  type ChatMessage,
} from '@/lib/messagesApi';
import { isBlocked, unblockUser } from '@/lib/moderationApi';
import { useAuth } from '@/stores/authStore';

export default function ChatThreadScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [context, setContext] = useState<ChatContext | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [sending, setSending] = useState(false);
  const [iBlockedThem, setIBlockedThem] = useState(false);
  const [unblocking, setUnblocking] = useState(false);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Depend on user.id (primitive), not the user object — avoids tearing down
  // the realtime channel every time the auth listener swaps the user reference
  // (e.g. on token refresh).
  const userId = user?.id;
  useEffect(() => {
    if (!id || !userId) return;

    let cancelled = false;
    (async () => {
      setErrored(false);
      try {
        const [ctx, initial] = await Promise.all([
          getChatContext(id, userId),
          listMessages(id, userId),
        ]);
        if (cancelled) return;
        setContext(ctx);
        setMessages(initial);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
        // Mark this conversation read for the current user.
        void markConversationRead(id);
        // Block status — drives the input-vs-banner swap below.
        if (ctx) {
          const blocked = await isBlocked(ctx.other.id);
          if (!cancelled) setIBlockedThem(blocked);
        }
      } catch (err: any) {
        if (cancelled) return;
        console.warn('[chat] load failed', err?.message ?? err);
        setErrored(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const unsubscribe = subscribeToMessages(id, userId, (msg) => {
      if (cancelled) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      // User is in the thread, so any incoming message is "read" the moment
      // it arrives.
      if (!msg.fromMe) {
        void markConversationRead(id);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [id, userId, retryNonce]);

  const retryLoad = () => {
    setLoading(true);
    setRetryNonce((n) => n + 1);
  };

  // Re-check the block flag whenever the user returns to this screen — they
  // may have just blocked / unblocked the other party from /user/[id].
  // Cheap single-row query, so safe to fire every focus.
  const otherId = context?.other.id;
  useFocusEffect(
    useCallback(() => {
      if (!otherId) return;
      let cancelled = false;
      isBlocked(otherId).then((blocked) => {
        if (!cancelled) setIBlockedThem(blocked);
      });
      return () => {
        cancelled = true;
      };
    }, [otherId]),
  );

  const onLongPressMessage = (msg: ChatMessage) => {
    // You can't report your own message — there's nothing to flag from the
    // platform's POV, and the obvious "report what I just typed" gesture
    // would be confusing.
    if (msg.fromMe) return;
    const openReport = () => setReportMessageId(msg.id);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Report message', 'Cancel'],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
          userInterfaceStyle: 'dark',
        },
        (i) => {
          if (i === 0) openReport();
        },
      );
    } else {
      Alert.alert('Message', undefined, [
        { text: 'Report message', style: 'destructive', onPress: openReport },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const askUnblock = () => {
    if (!context || unblocking) return;
    Alert.alert(
      `Unblock ${context.other.firstName}?`,
      'They will be able to see your activities again. You can re-block them at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            setUnblocking(true);
            try {
              await unblockUser(context.other.id);
              setIBlockedThem(false);
            } catch (err: any) {
              Alert.alert('Could not unblock', err?.message ?? 'Please try again.');
            } finally {
              setUnblocking(false);
            }
          },
        },
      ],
    );
  };

  if (!id || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NavBar
          title="Chat"
          initial="?"
          avatarUri={null}
          context=""
          onBack={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NavBar
          title="Loading…"
          initial="…"
          avatarUri={null}
          context=""
          onBack={() => router.back()}
        />
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent.gold} />
        </View>
      </SafeAreaView>
    );
  }

  if (errored) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NavBar
          title="Chat"
          initial="?"
          avatarUri={null}
          context=""
          onBack={() => router.back()}
        />
        <LoadErrorState title="Couldn't load messages." onRetry={retryLoad} />
      </SafeAreaView>
    );
  }

  if (!context) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <NavBar
          title="Chat"
          initial="?"
          avatarUri={null}
          context=""
          onBack={() => router.back()}
        />
        <View style={styles.missing}>
          <Text style={styles.missingText}>Conversation not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    try {
      await sendMessage(id, text);
      // Realtime will push the row back to us — no optimistic insert needed.
    } catch (err: any) {
      Alert.alert('Could not send', err?.message ?? 'Please try again.');
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <NavBar
          title={context.other.firstName}
          initial={context.other.initial}
          avatarUri={context.other.avatarUri}
          context={context.venueContext}
          onBack={() => router.back()}
          onAvatarPress={() => router.push(`/user/${context.other.id}`)}
        />

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {messages.length === 0 ? (
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>
                Say hi to {context.other.firstName} 👋
              </Text>
            </View>
          ) : (
            messages.map((m, i) => {
              const showTime =
                i === 0 || messages[i - 1].fromMe !== m.fromMe;
              const time = formatBubbleTime(m.createdAt);
              return (
                <View key={m.id} style={{ width: '100%' }}>
                  {showTime && <Text style={styles.timestamp}>{time}</Text>}
                  <Pressable
                    onLongPress={() => onLongPressMessage(m)}
                    delayLongPress={350}
                    style={({ pressed }) => [
                      styles.bubble,
                      m.fromMe ? styles.bubbleMe : styles.bubbleThem,
                      pressed && !m.fromMe && { opacity: 0.7 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        m.fromMe ? styles.bubbleTextMe : styles.bubbleTextThem,
                      ]}
                    >
                      {m.text}
                    </Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>

        {iBlockedThem ? (
          <View style={styles.blockedBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.blockedTitle}>
                You've blocked {context.other.firstName}.
              </Text>
              <Text style={styles.blockedBody}>
                Unblock to send messages.
              </Text>
            </View>
            <Pressable
              onPress={askUnblock}
              disabled={unblocking}
              style={({ pressed }) => [
                styles.unblockBtn,
                pressed && !unblocking && { opacity: 0.7 },
              ]}
              hitSlop={6}
            >
              {unblocking ? (
                <ActivityIndicator color={colors.accent.gold} size="small" />
              ) : (
                <Text style={styles.unblockText}>Unblock</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.inputBar}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a message…"
              placeholderTextColor={colors.text.faint}
              style={styles.input}
              multiline
            />
            <Pressable
              onPress={send}
              disabled={!draft.trim() || sending}
              style={[
                styles.sendBtn,
                (!draft.trim() || sending) && styles.sendBtnDisabled,
              ]}
            >
              {sending ? (
                <ActivityIndicator color={colors.accent.goldDark} />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={
                    !draft.trim() ? colors.text.faint : colors.accent.goldDark
                  }
                />
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>

      {reportMessageId && (
        <ReportSheet
          visible
          target={{ messageId: reportMessageId }}
          title={`Report message`}
          onClose={() => setReportMessageId(null)}
        />
      )}
    </SafeAreaView>
  );
}

function formatBubbleTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = new Date(d);
  startOfDay.setHours(0, 0, 0, 0);
  const dayDiff = Math.round(
    (startOfDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );

  const time = `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
  if (dayDiff === 0) return time;
  if (dayDiff === -1) return `Yesterday ${time}`;
  return `${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} ${time}`;
}

function NavBar({
  title,
  initial,
  avatarUri,
  context,
  onBack,
  onAvatarPress,
}: {
  title: string;
  initial: string;
  avatarUri: string | null;
  context: string;
  onBack: () => void;
  onAvatarPress?: () => void;
}) {
  return (
    <View style={styles.navBar}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.navBtn}>
        <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
      </Pressable>
      <Pressable
        onPress={onAvatarPress}
        disabled={!onAvatarPress}
        style={styles.navCenter}
        hitSlop={6}
      >
        <Avatar uri={avatarUri} initial={initial} size={34} gold />
        <View>
          <Text style={styles.navTitle}>{title}</Text>
          {!!context && <Text style={styles.navContext}>{context}</Text>}
        </View>
      </Pressable>
      <View style={styles.navBtn} />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    justifyContent: 'center',
  },
  navTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  navContext: {
    ...typography.tiny,
    color: colors.accent.gold,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  emptyChatText: {
    ...typography.body,
    color: colors.text.muted,
  },
  timestamp: {
    ...typography.tiny,
    color: colors.text.faint,
    textAlign: 'center',
    marginVertical: spacing.sm,
    letterSpacing: 1,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    marginBottom: 4,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent.gold,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    ...typography.body,
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: colors.accent.goldDark,
  },
  bubbleTextThem: {
    color: colors.text.primary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.secondary,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.primary,
    color: colors.text.primary,
    fontSize: 15,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.border.default,
  },
  blockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.secondary,
  },
  blockedTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  blockedBody: {
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
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingText: {
    ...typography.body,
    color: colors.text.muted,
  },
});
