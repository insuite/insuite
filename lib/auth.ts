import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from './supabase';

export interface AppleSignInResult {
  userId: string;
  email: string | null;
  appleGivenName: string | null;
  session: Session;
}

/**
 * Run Apple Sign-In and exchange for a Supabase session.
 *
 * On iOS uses the native `expo-apple-authentication` flow and resolves with
 * the session synchronously. On web triggers a full-page redirect to Apple
 * via Supabase OAuth — the function does not resolve with a session because
 * the browser navigates away; the session is picked up after redirect by
 * `onAuthStateChange` (the auth gate in `stores/authStore.ts`). Returns
 * `null` in that case so the caller knows to stop and wait.
 */
export async function signInWithApple(): Promise<AppleSignInResult | null> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase env vars not set. Copy .env.example to .env and fill in EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return null;
  }

  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign-In is only available on iOS and web.');
  }

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;
  if (!data.user || !data.session) {
    throw new Error('Supabase did not return a session.');
  }

  return {
    userId: data.user.id,
    email: credential.email ?? data.user.email ?? null,
    appleGivenName: credential.fullName?.givenName ?? null,
    session: data.session,
  };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
