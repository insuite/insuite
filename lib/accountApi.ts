import { authStore } from '@/stores/authStore';

import { isSupabaseConfigured, supabase } from './supabase';

const AVATAR_BUCKET = 'avatars';

/**
 * Permanently delete the current user's account.
 *
 * Steps:
 *   1. Best-effort delete avatar files from Storage (not cascaded by Postgres
 *      foreign keys).
 *   2. Call the `delete_account` RPC, which removes the auth.users row.
 *      Cascade FKs handle profiles + activities + join_requests +
 *      conversations + messages + passes + referrals + conversation_reads.
 *   3. Sign out client-side to clear the local Supabase session immediately
 *      (the auth listener will fire as well, but we don't want to wait).
 */
export async function deleteAccount(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured.');
  }
  const session = authStore.get().session;
  if (!session) {
    throw new Error('Not signed in.');
  }
  const userId = session.user.id;

  // 1. Storage cleanup (orphans are recoverable, so ignore failures)
  try {
    const { data: files } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list(userId);
    if (files && files.length > 0) {
      await supabase.storage
        .from(AVATAR_BUCKET)
        .remove(files.map((f) => `${userId}/${f.name}`));
    }
  } catch (err) {
    console.warn('[deleteAccount] avatar cleanup failed', err);
  }

  // 2. Delete auth.users (cascades to all public tables)
  const { error } = await supabase.rpc('delete_account');
  if (error) throw error;

  // 3. Local sign-out so the auth gate routes us back to /welcome
  await supabase.auth.signOut();
}
