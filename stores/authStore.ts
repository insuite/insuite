import type { Session, User } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';

import type { VenueKey } from '@/constants/venues';
import {
  registerIfAlreadyGranted,
  unregisterPushNotifications,
} from '@/lib/notifications';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

import { notificationsStore } from './notificationsStore';
import { profileStore } from './profileStore';

export type AuthStatus = 'loading' | 'signedOut' | 'needsOnboarding' | 'ready';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
}

const initial: AuthState = {
  status: isSupabaseConfigured ? 'loading' : 'signedOut',
  session: null,
  user: null,
};

let state: AuthState = { ...initial };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function set(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  emit();
}

/**
 * Bootstraps from any persisted Supabase session. Determines whether the user
 * still needs onboarding (no profile row yet) or is fully ready. Subscribes to
 * future auth state changes for sign-in / sign-out.
 *
 * Safe to call multiple times — subsequent calls are no-ops.
 */
let initStarted = false;
async function init() {
  if (initStarted) return;
  initStarted = true;
  if (!supabase) {
    set({ status: 'signedOut' });
    return;
  }

  const { data } = await supabase.auth.getSession();
  await applySession(data.session);

  supabase.auth.onAuthStateChange((_event, session) => {
    void applySession(session);
  });
}

async function applySession(session: Session | null) {
  if (!session) {
    // Try to clear the previous user's push token from the DB before we lose
    // the session. Best-effort — auth listener fires this with `session=null`
    // after a sign-out, by which point we may already lack permission.
    const prev = state.user?.id;
    if (prev) {
      void unregisterPushNotifications(prev);
    }
    profileStore.reset();
    notificationsStore.reset();
    set({ status: 'signedOut', session: null, user: null });
    return;
  }

  set({ session, user: session.user });

  if (!supabase) return;
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error) {
    console.warn('[authStore] profile fetch failed', error.message);
  }

  if (!profile) {
    // No profile row could mean (a) brand-new user who hasn't onboarded yet,
    // or (b) the auth.users row this session points to was deleted out from
    // under us — Dashboard delete, an account-deletion RPC that didn't get
    // a chance to signOut, etc. Disambiguate by hitting the server-side
    // `getUser()` (unlike `getSession()`, this validates the JWT against the
    // live users table). If invalid, signOut so the auth gate routes back to
    // Welcome instead of stranding the user in onboarding with an FK that
    // will fail at the final profile upsert.
    const { error: validateErr } = await supabase.auth.getUser();
    if (validateErr) {
      console.warn(
        '[authStore] session points to a missing auth user, signing out:',
        validateErr.message,
      );
      await supabase.auth.signOut();
      return;
    }
    set({ status: 'needsOnboarding' });
    return;
  }

  profileStore.set({
    firstName: profile.first_name,
    bio: profile.bio ?? '',
    languages: profile.languages,
    openTo: profile.open_to as VenueKey[],
    vibeTags: profile.vibe_tags,
    referralCode: profile.referral_code ?? generateReferralCode(profile.first_name),
    avatarUri: profile.avatar_url,
    isAdmin: profile.is_admin ?? false,
  });
  set({ status: 'ready' });
  void notificationsStore.refresh(session.user.id);
  // Re-register the push token IF permission was already granted in a previous
  // session. New users get the system prompt via the PushPrimingSheet on
  // Discover instead — that way we can prime them with our own copy first
  // (Apple HIG recommends explaining the "why" before the system dialog).
  void registerIfAlreadyGranted(session.user.id);
}

function generateReferralCode(name: string): string {
  const prefix = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'GUEST';
  const suffix = Math.floor(Math.random() * 10);
  return `${prefix}${suffix}`;
}

function getSnapshot() {
  return state;
}

export const authStore = {
  get: () => state,
  set,
  init,
  applySession,
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

export function useAuth(): AuthState {
  return useSyncExternalStore(authStore.subscribe, getSnapshot, getSnapshot);
}
