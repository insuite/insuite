-- =====================================================
-- Push tokens — run once in Supabase SQL Editor.
-- Adds `expo_push_token` to profiles. The Edge Function (next phase) reads
-- this column to know where to send pushes for join_requests / messages.
-- =====================================================

alter table profiles
  add column if not exists expo_push_token text;

create index if not exists profiles_push_token_idx
  on profiles (expo_push_token)
  where expo_push_token is not null;
