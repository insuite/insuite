import { useSyncExternalStore } from 'react';

import { listConversations, listIncomingRequests } from '@/lib/messagesApi';

interface NotificationsState {
  pendingRequestsCount: number;
  unreadConversationsCount: number;
}

const initial: NotificationsState = {
  pendingRequestsCount: 0,
  unreadConversationsCount: 0,
};

let state: NotificationsState = { ...initial };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const notificationsStore = {
  get: () => state,
  set: (patch: Partial<NotificationsState>) => {
    state = { ...state, ...patch };
    emit();
  },
  reset: () => {
    state = { ...initial };
    emit();
  },
  /**
   * Refresh both counts from DB in parallel. Caller passes the current user id
   * (avoids a circular import with authStore). Background poll, so transient
   * load failures are swallowed — the next refresh tick will retry naturally
   * and the existing counts stay on screen until then.
   */
  refresh: async (userId: string) => {
    try {
      const [requests, convos] = await Promise.all([
        listIncomingRequests(userId),
        listConversations(userId),
      ]);
      notificationsStore.set({
        pendingRequestsCount: requests.length,
        unreadConversationsCount: convos.filter((c) => c.unread).length,
      });
    } catch (err: any) {
      console.warn('[notifications] refresh failed', err?.message ?? err);
    }
  },
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

function getSnapshot() {
  return state;
}

export function useNotifications(): NotificationsState {
  return useSyncExternalStore(
    notificationsStore.subscribe,
    getSnapshot,
    getSnapshot,
  );
}
