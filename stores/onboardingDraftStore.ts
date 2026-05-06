import { useSyncExternalStore } from 'react';

import type { VenueKey } from '@/constants/venues';

export interface OnboardingDraft {
  firstName: string;
  languages: string[];
  openTo: VenueKey[];
  bio: string;
}

const initial: OnboardingDraft = {
  firstName: '',
  languages: [],
  openTo: [],
  bio: '',
};

let state: OnboardingDraft = { ...initial };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const onboardingDraft = {
  get: () => state,
  set: (patch: Partial<OnboardingDraft>) => {
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

export function useOnboardingDraft(): OnboardingDraft {
  return useSyncExternalStore(
    onboardingDraft.subscribe,
    getSnapshot,
    getSnapshot,
  );
}
