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
   * (avoids a circular import with authStore).
   */
  refresh: async (userId: string) => {
    const [requests, convos] = await Promise.all([
      listIncomingRequests(userId),
      listConversations(userId),
    ]);
    notificationsStore.set({
      pendingRequestsCount: requests.length,
      unreadConversationsCount: convos.filter((c) => c.unread).length,
    });
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
