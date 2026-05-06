-- =====================================================
-- Conversation summaries — run once in Supabase SQL Editor.
-- Replaces the N+1 query pattern in listConversations() with a single RPC
-- call that returns the latest message per conversation.
--
-- NO `security definer` — RLS on `messages` already restricts SELECT to the
-- caller's conversations, so the function runs as the caller.
-- =====================================================

create or replace function get_conversation_latest_messages(conv_ids uuid[])
returns table(
  conversation_id uuid,
  content text,
  created_at timestamptz,
  sender_id uuid
)
language sql
stable
set search_path = public
as $$
  select distinct on (m.conversation_id)
    m.conversation_id, m.content, m.created_at, m.sender_id
  from messages m
  where m.conversation_id = any(conv_ids)
  order by m.conversation_id, m.created_at desc;
$$;

revoke all on function get_conversation_latest_messages(uuid[]) from public;
grant execute on function get_conversation_latest_messages(uuid[]) to authenticated;
