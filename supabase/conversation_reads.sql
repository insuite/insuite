-- =====================================================
-- Conversation read tracking — run once in Supabase SQL Editor.
-- Stores per-(conversation, user) the last time the user opened the chat,
-- so the Messages list can show "unread" indicators.
-- =====================================================

create table if not exists conversation_reads (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists conversation_reads_user_idx
  on conversation_reads (user_id);

alter table conversation_reads enable row level security;

drop policy if exists "conversation_reads readable by owner"
  on conversation_reads;
create policy "conversation_reads readable by owner"
  on conversation_reads for select to authenticated using (
    auth.uid() = user_id
  );

drop policy if exists "conversation_reads upsert by owner"
  on conversation_reads;
create policy "conversation_reads upsert by owner"
  on conversation_reads for insert to authenticated with check (
    auth.uid() = user_id
    and exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

drop policy if exists "conversation_reads update by owner"
  on conversation_reads;
create policy "conversation_reads update by owner"
  on conversation_reads for update to authenticated using (
    auth.uid() = user_id
  ) with check (
    auth.uid() = user_id
  );
