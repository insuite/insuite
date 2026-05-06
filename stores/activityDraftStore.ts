import { useSyncExternalStore } from 'react';

import type { VenueKey } from '@/constants/venues';

export interface ActivityDraft {
  hotelId: string | null;
  hotelName: string | null;
  hotelCity: string | null;
  venue: VenueKey | null;
  date: string | null;
  timeFrom: string | null;
  timeTo: string | null;
  note: string;
}

const initial: ActivityDraft = {
  hotelId: null,
  hotelName: null,
  hotelCity: null,
  venue: null,
  date: null,
  timeFrom: null,
  timeTo: null,
  note: '',
};

let state: ActivityDraft = { ...initial };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const activityDraft = {
  get: () => state,
  set: (patch: Partial<ActivityDraft>) => {
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

export function useActivityDraft(): ActivityDraft {
  return useSyncExternalStore(activityDraft.subscribe, getSnapshot, getSnapshot);
}
