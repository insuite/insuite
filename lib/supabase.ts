import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { VenueKey } from '@/constants/venues';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!url && !!anonKey;

/**
 * Supabase client. Will be `null` if env vars are missing — call sites should
 * guard with `isSupabaseConfigured` and fall back to local-only behaviour.
 */
export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url!, anonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// =====================================================
// Database type (mirrors supabase/schema.sql)
// =====================================================

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string;
          bio: string | null;
          languages: string[];
          open_to: VenueKey[];
          vibe_tags: string[];
          avatar_url: string | null;
          referral_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name: string;
          bio?: string | null;
          languages?: string[];
          open_to?: VenueKey[];
          vibe_tags?: string[];
          avatar_url?: string | null;
          referral_code?: string | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      hotels: {
        Row: {
          id: string;
          name: string;
          city: string;
          country: string;
          address: string | null;
          created_at: string;
        };
      };
      activities: {
        Row: {
          id: string;
          host_id: string;
          hotel_id: string;
          venue: VenueKey;
          date: string;
          time_from: string;
          time_to: string;
          note: string | null;
          max_spots: number;
          status: 'active' | 'cancelled' | 'completed';
          created_at: string;
        };
        Insert: {
          host_id: string;
          hotel_id: string;
          venue: VenueKey;
          date: string;
          time_from: string;
          time_to: string;
          note?: string | null;
          max_spots?: number;
        };
      };
      join_requests: {
        Row: {
          id: string;
          activity_id: string;
          requester_id: string;
          status: 'pending' | 'accepted' | 'declined';
          created_at: string;
        };
        Insert: {
          activity_id: string;
          requester_id: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          activity_id: string;
          participant_a: string;
          participant_b: string;
          created_at: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          content: string;
        };
      };
      passes: {
        Row: {
          id: string;
          user_id: string;
          type: 'trip_14' | 'free_7' | 'referral_7';
          starts_at: string;
          expires_at: string;
          created_at: string;
        };
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          code: string;
          rewarded: boolean;
          created_at: string;
        };
      };
    };
  };
};
