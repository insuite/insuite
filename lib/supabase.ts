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
// Database type — mirrors supabase/*.sql.
//
// Hand-authored rather than generated from the live project: keeps
// VenueKey narrowing on venue / open_to, and avoids the supabase-CLI
// login dance for now. When schema changes, update both the SQL file
// AND the matching block here.
// =====================================================

type ReportReason =
  | 'harassment'
  | 'sexual'
  | 'spam'
  | 'impersonation'
  | 'underage'
  | 'other';

type PassType = 'trip_14' | 'free_7' | 'referral_7' | 'pass_7' | 'pass_14' | 'pass_30';

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
          expo_push_token: string | null;
          is_unlimited: boolean;
          is_admin: boolean;
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
          expo_push_token?: string | null;
          is_unlimited?: boolean;
          // is_admin is intentionally omitted from Insert/Update: it's
          // service-role-only (column-level revoke from authenticated).
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
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
        Insert: {
          name: string;
          city: string;
          country: string;
          address?: string | null;
        };
        Update: Partial<Database['public']['Tables']['hotels']['Insert']>;
        Relationships: [];
      };
      hotel_requests: {
        Row: {
          id: string;
          requester_id: string;
          name: string;
          city: string;
          country: string;
          notes: string | null;
          status: 'pending' | 'approved' | 'rejected';
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: {
          requester_id: string;
          name: string;
          city: string;
          country: string;
          notes?: string | null;
        };
        // Update includes status / reviewed_at so the admin queue can flip
        // them without going through Insert's user-facing shape.
        Update: {
          name?: string;
          city?: string;
          country?: string;
          notes?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          reviewed_at?: string | null;
        };
        Relationships: [];
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
          status?: 'active' | 'cancelled' | 'completed';
        };
        Update: Partial<Database['public']['Tables']['activities']['Insert']>;
        Relationships: [];
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
          status?: 'pending' | 'accepted' | 'declined';
        };
        Update: Partial<Database['public']['Tables']['join_requests']['Insert']>;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          activity_id: string;
          participant_a: string;
          participant_b: string;
          created_at: string;
        };
        Insert: {
          activity_id: string;
          participant_a: string;
          participant_b: string;
        };
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
        Relationships: [];
      };
      conversation_reads: {
        Row: {
          conversation_id: string;
          user_id: string;
          last_read_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          last_read_at?: string;
        };
        Update: Partial<Database['public']['Tables']['conversation_reads']['Insert']>;
        Relationships: [];
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
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
        Relationships: [];
      };
      passes: {
        Row: {
          id: string;
          user_id: string;
          type: PassType;
          starts_at: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          type: PassType;
          starts_at: string;
          expires_at: string;
        };
        Update: Partial<Database['public']['Tables']['passes']['Insert']>;
        Relationships: [];
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          code: string;
          rewarded: boolean;
          redeemer_rewarded: boolean;
          created_at: string;
        };
        Insert: {
          referrer_id: string;
          referred_id: string;
          code: string;
          rewarded?: boolean;
          redeemer_rewarded?: boolean;
        };
        Update: Partial<Database['public']['Tables']['referrals']['Insert']>;
        Relationships: [];
      };
      blocks: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
        };
        Update: Partial<Database['public']['Tables']['blocks']['Insert']>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string | null;
          reported_activity_id: string | null;
          reported_message_id: string | null;
          reason: ReportReason;
          details: string | null;
          status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: {
          reporter_id: string;
          reported_user_id?: string | null;
          reported_activity_id?: string | null;
          reported_message_id?: string | null;
          reason: ReportReason;
          details?: string | null;
        };
        Update: Partial<Database['public']['Tables']['reports']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      delete_account: {
        Args: Record<string, never>;
        Returns: void;
      };
      get_conversation_latest_messages: {
        Args: { conv_ids: string[] };
        Returns: {
          conversation_id: string;
          content: string;
          created_at: string;
          sender_id: string;
        }[];
      };
      claim_referral: {
        Args: { p_code: string };
        Returns:
          | { ok: true; referrer_name: string; pass_granted?: boolean }
          | { ok: false; error: string };
      };
    };
  };
};
