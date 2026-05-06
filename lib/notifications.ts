import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Foreground display behaviour: when a push arrives while the app is open,
 * show a banner + play sound. (We could refine to suppress when user is
 * already inside the relevant chat thread — defer.)
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Deep-link payload we attach to every push, so the tap handler in
 * (app)/_layout can route appropriately.
 */
export interface PushPayload {
  type?: 'message' | 'join_request' | 'request_accepted';
  conversationId?: string;
  activityId?: string;
}

/**
 * Request permission, get an Expo push token, and persist it on the user's
 * profile. Idempotent — re-runs are safe and overwrite any prior token.
 *
 * Notes:
 *   - On iOS, `getExpoPushTokenAsync` requires a real device (simulator returns
 *     a "DeviceNotRegisteredError"). We swallow that case so dev on simulator
 *     doesn't error out.
 *   - In Expo Go on iOS the token is backed by Expo's shared APNs cert. In a
 *     dev/production build it uses your own APNs key (configured in EAS).
 */
export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  // Permission
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const ask = await Notifications.requestPermissionsAsync();
    status = ask.status;
  }
  if (status !== 'granted') {
    console.log('[push] permission denied');
    return;
  }

  // Android channel (no-op on iOS but harmless)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#c9b98a',
    });
  }

  // Token
  let token: string | null = null;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const result = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    token = result.data;
  } catch (err) {
    console.warn('[push] could not get token (likely simulator)', err);
    return;
  }

  if (!token) return;

  // Persist
  const { error } = await supabase
    .from('profiles')
    .update({ expo_push_token: token })
    .eq('id', userId);
  if (error) {
    console.warn('[push] could not save token', error.message);
  } else {
    console.log('[push] registered token', token.slice(0, 30) + '…');
  }
}

/**
 * Clear the current user's push token in the DB. Call on sign-out so old
 * tokens stop receiving pushes after the user has left the device.
 */
export async function unregisterPushNotifications(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase
    .from('profiles')
    .update({ expo_push_token: null })
    .eq('id', userId);
}
