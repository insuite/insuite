import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';
import { subscribeToInbox } from '@/lib/messagesApi';
import { type PushPayload } from '@/lib/notifications';
import { useAuth } from '@/stores/authStore';
import { notificationsStore, useNotifications } from '@/stores/notificationsStore';

export default function AppTabsLayout() {
  const { user } = useAuth();
  const router = useRouter();

  // Keep notification counts live across the whole tab tree by subscribing to
  // any inbox event (new message in any of my conversations, new/updated join
  // request). Without this, the badge only refreshed when Messages was opened.
  useEffect(() => {
    if (!user) return;
    void notificationsStore.refresh(user.id);
    const unsubscribe = subscribeToInbox(user.id, () => {
      void notificationsStore.refresh(user.id);
    });
    return unsubscribe;
  }, [user?.id]);

  // Tap a push notification → deep-link based on payload.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data as PushPayload;
      if (data?.type === 'message' && data.conversationId) {
        router.push(`/messages/${data.conversationId}`);
      } else if (data?.type === 'request_accepted' && data.conversationId) {
        router.push(`/messages/${data.conversationId}`);
      } else if (data?.type === 'join_request') {
        router.push('/messages');
      }
    });
    return () => sub.remove();
  }, [router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent.gold,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'compass' : 'compass-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activities',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <MessagesTabIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

function MessagesTabIcon({
  color,
  focused,
}: {
  color: string;
  focused: boolean;
}) {
  const { pendingRequestsCount, unreadConversationsCount } = useNotifications();
  const hasBadge = pendingRequestsCount > 0 || unreadConversationsCount > 0;
  return (
    <View>
      <Ionicons
        name={focused ? 'chatbubble' : 'chatbubble-outline'}
        size={22}
        color={color}
      />
      {hasBadge && <View style={styles.badge} />}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bg.secondary,
    borderTopColor: colors.border.subtle,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 86,
    paddingTop: 8,
  },
  tabItem: {
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent.gold,
    borderWidth: 2,
    borderColor: colors.bg.secondary,
  },
});
