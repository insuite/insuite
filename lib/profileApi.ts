import * as ImageManipulator from 'expo-image-manipulator';

import type { VenueKey } from '@/constants/venues';
import { authStore } from '@/stores/authStore';
import { type Profile, profileStore } from '@/stores/profileStore';

import { isSupabaseConfigured, supabase, type Database } from './supabase';

export interface UserProfileSummary {
  id: string;
  firstName: string;
  initial: string;
  bio: string;
  languages: string[];
  openTo: VenueKey[];
  vibeTags: string[];
  avatarUri: string | null;
}

type DbUpdate = Database['public']['Tables']['profiles']['Update'];

const AVATAR_BUCKET = 'avatars';
const AVATAR_FILENAME = 'avatar.jpg';
const AVATAR_MAX_WIDTH = 800;
const AVATAR_QUALITY = 0.75;
const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB safety cap

/**
 * Translate a local Profile patch (camelCase) to a Supabase row patch
 * (snake_case + null vs '' handling).
 */
function toDbPatch(patch: Partial<Profile>): DbUpdate {
  const out: DbUpdate = {};
  if (patch.firstName !== undefined) out.first_name = patch.firstName;
  if (patch.bio !== undefined) out.bio = patch.bio.length > 0 ? patch.bio : null;
  if (patch.languages !== undefined) out.languages = patch.languages;
  if (patch.openTo !== undefined) out.open_to = patch.openTo;
  if (patch.vibeTags !== undefined) out.vibe_tags = patch.vibeTags;
  if (patch.avatarUri !== undefined) out.avatar_url = patch.avatarUri;
  if (patch.referralCode !== undefined) out.referral_code = patch.referralCode;
  return out;
}

/**
 * Persist a profile change to Supabase (when signed in) and the local store.
 * In demo mode (no Supabase env) this falls back to a local-only update.
 *
 * Throws on DB failure — callers should wrap in try/catch and surface the
 * error to the user.
 */
export async function commitProfileUpdate(patch: Partial<Profile>): Promise<void> {
  const session = authStore.get().session;

  if (isSupabaseConfigured && supabase && session) {
    const dbPatch = toDbPatch(patch);
    const { error } = await supabase
      .from('profiles')
      .update(dbPatch)
      .eq('id', session.user.id);
    if (error) throw error;
  }

  profileStore.set(patch);
}

/**
 * Resize + compress a picked image to a sane size (max 800px wide, JPEG 0.75)
 * before upload. Avatar display tops out at ~260px (lightbox) so 800 is plenty
 * even at 3× pixel density.
 */
async function compressForAvatar(localUri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: AVATAR_MAX_WIDTH } }],
    {
      compress: AVATAR_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
  return result.uri;
}

/**
 * Upload a picked image as the user's avatar. Strategy:
 *   - Compress to 800w / JPEG 0.75 (typical result ~80–150 KB)
 *   - Hard-reject anything still > 2 MB after compression
 *   - One file per user: pre-clean any existing files in the user's folder
 *   - Fixed path `{uid}/avatar.jpg` so storage stays at exactly 1 file per user
 *   - Return the public URL with a `?t=` cache-buster so RN <Image> refreshes
 *
 * Falls back to returning the local URI when Supabase isn't configured (demo
 * mode), so the picker still appears to "work".
 */
export async function uploadAvatar(localUri: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    return localUri;
  }
  const session = authStore.get().session;
  if (!session) {
    throw new Error('Not signed in.');
  }

  // 1. Resize + compress
  const compressedUri = await compressForAvatar(localUri);

  // 2. Read bytes + guard against pathological output sizes
  const response = await fetch(compressedUri);
  if (!response.ok) {
    throw new Error(`Could not read compressed image (HTTP ${response.status}).`);
  }
  const fileBuffer = await response.arrayBuffer();
  if (fileBuffer.byteLength === 0) {
    throw new Error('File read returned 0 bytes after compression.');
  }
  if (fileBuffer.byteLength > AVATAR_MAX_BYTES) {
    const mb = (fileBuffer.byteLength / (1024 * 1024)).toFixed(1);
    throw new Error(`Image too large after compression (${mb} MB). Try a smaller photo.`);
  }

  // 3. One-file-per-user: clear any prior files (stale timestamped uploads,
  // older formats, etc.) before writing the new one.
  const { data: existing } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(session.user.id);
  if (existing && existing.length > 0) {
    const paths = existing.map((f) => `${session.user.id}/${f.name}`);
    await supabase.storage.from(AVATAR_BUCKET).remove(paths);
  }

  // 4. Upload to fixed path
  const path = `${session.user.id}/${AVATAR_FILENAME}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (uploadError) throw uploadError;

  // 5. Return URL with cache-buster — same path means CDN caches the old
  // image, so we append `?t=now` to force <Image> to re-fetch.
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

/**
 * Read another user's public profile by id. RLS allows any authenticated
 * reader to select profiles.
 */
export async function getUserProfile(
  id: string,
): Promise<UserProfileSummary | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, bio, languages, open_to, vibe_tags, avatar_url')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    firstName: data.first_name,
    initial: (data.first_name[0] ?? '?').toUpperCase(),
    bio: data.bio ?? '',
    languages: data.languages ?? [],
    openTo: (data.open_to ?? []) as VenueKey[],
    vibeTags: data.vibe_tags ?? [],
    avatarUri: data.avatar_url,
  };
}

/**
 * Delete the user's avatar from Storage and clear the DB pointer.
 */
export async function removeAvatar(): Promise<void> {
  const session = authStore.get().session;
  if (isSupabaseConfigured && supabase && session) {
    const { data: existing } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list(session.user.id);
    if (existing && existing.length > 0) {
      const paths = existing.map((f) => `${session.user.id}/${f.name}`);
      await supabase.storage.from(AVATAR_BUCKET).remove(paths);
    }
  }
  await commitProfileUpdate({ avatarUri: null });
}
