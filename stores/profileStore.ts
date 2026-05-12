import { useSyncExternalStore } from 'react';

import type { VenueKey } from '@/constants/venues';

export interface Profile {
  firstName: string;
  bio: string;
  languages: string[];        // ISO codes: 'en', 'zh-TW', …
  openTo: VenueKey[];
  vibeTags: string[];
  referralCode: string;
  avatarUri: string | null;   // local URI in UI mode; will become Supabase Storage URL later
  isAdmin: boolean;           // set true via Dashboard; unlocks /admin screens
}

const initial: Profile = {
  firstName: 'You',
  bio: '',
  languages: ['en', 'zh-TW'],
  openTo: ['breakfast', 'lounge', 'dinner'],
  vibeTags: ['Quiet', 'Early riser'],
  referralCode: 'INSUITE1',
  avatarUri: null,
  isAdmin: false,
};

let state: Profile = { ...initial };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const profileStore = {
  get: () => state,
  set: (patch: Partial<Profile>) => {
    state = { ...state, ...patch };
    emit();
  },
  reset: () => {
    state = { ...initial };
    emit();
  },
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

function getSnapshot() {
  return state;
}

export function useProfile(): Profile {
  return useSyncExternalStore(profileStore.subscribe, getSnapshot, getSnapshot);
}
