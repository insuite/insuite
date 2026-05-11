-- =====================================================
-- Block + Report — Apple App Store Review Guideline 1.2 compliance.
--
-- Blocks: user A blocks user B → B's activities disappear from A's
-- Discover feed, B's messages disappear from A's chat threads. Block
-- is one-directional from the writer's side, but the SELECT policies
-- below also hide A's content from B (bidirectional invisibility) so
-- the blocker isn't accidentally exposed.
--
-- Reports: free-form report row tied to one of (user / activity /
-- message). Owner reviews via Supabase dashboard, marks reviewed /
-- actioned / dismissed. No automated moderation in v1.
-- =====================================================

-- ────────────────────────── blocks ──────────────────────────

create table if not exists blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocked_idx on blocks (blocked_id);

alter table blocks enable row level security;

drop policy if exists "blocks insert as self" on blocks;
create policy "blocks insert as self"
  on blocks for insert to authenticated
  with check (auth.uid() = blocker_id);

drop policy if exists "blocks delete as self" on blocks;
create policy "blocks delete as self"
  on blocks for delete to authenticated
  using (auth.uid() = blocker_id);

-- Caller can read their own block list (for an "Unblock" UI later).
drop policy if exists "blocks read own" on blocks;
create policy "blocks read own"
  on blocks for select to authenticated
  using (auth.uid() = blocker_id);


-- ────────────────────────── reports ──────────────────────────

create table if not exists reports (
  id                   uuid primary key default gen_random_uuid(),
  reporter_id          uuid not null references profiles(id) on delete cascade,
  reported_user_id     uuid references profiles(id) on delete cascade,
  reported_activity_id uuid references activities(id) on delete cascade,
  reported_message_id  uuid references messages(id) on delete cascade,
  reason               text not null check (reason in (
    'harassment','sexual','spam','impersonation','underage','other'
  )),
  details              text check (details is null or char_length(details) <= 1000),
  status               text not null default 'pending'
                        check (status in ('pending','reviewed','actioned','dismissed')),
  created_at           timestamptz not null default now(),
  reviewed_at          timestamptz,
  -- At least one target identifier must be set.
  check (
    reported_user_id     is not null or
    reported_activity_id is not null or
    reported_message_id  is not null
  )
);
create index if not exists reports_status_idx
  on reports (status, created_at);
create index if not exists reports_reporter_idx
  on reports (reporter_id, created_at desc);

alter table reports enable row level security;

drop policy if exists "reports insert as self" on reports;
create policy "reports insert as self"
  on reports for insert to authenticated
  with check (auth.uid() = reporter_id);

-- Reporter can read their own submissions; admin uses the service-role
-- key in the dashboard.
drop policy if exists "reports read own" on reports;
create policy "reports read own"
  on reports for select to authenticated
  using (auth.uid() = reporter_id);


-- ──────── adjust SELECT policies to honour blocks ────────

-- Activities: hide rows where the host has been blocked by, or is
-- blocking, the caller.
drop policy if exists "activities readable by authenticated" on activities;
drop policy if exists "activities readable minus blocks"     on activities;
create policy "activities readable minus blocks"
  on activities for select to authenticated using (
    not exists (
      select 1 from blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = activities.host_id)
         or (b.blocker_id = activities.host_id and b.blocked_id = auth.uid())
    )
  );

-- Messages: hide messages whose sender has blocked the caller — a
-- harasser the caller has been blocked by shouldn't be able to keep
-- talking at them. The reverse direction (caller blocked the sender)
-- intentionally does NOT hide: the caller keeps the chat history
-- intact for their own reference and just loses the ability to reply
-- (see the INSERT policy below + the chat-thread banner in the UI).
drop policy if exists "messages visible to conversation participants" on messages;
drop policy if exists "messages visible minus blocks"                  on messages;
create policy "messages visible minus blocks"
  on messages for select to authenticated using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
    and not exists (
      select 1 from blocks b
      where b.blocker_id = sender_id and b.blocked_id = auth.uid()
    )
  );

-- Messages INSERT: blocks the caller from messaging conversations whose
-- other participant they have blocked. Replaces schema.sql's plain
-- "messages insert as sender in own conversation" — defense-in-depth so
-- the chat-thread banner in app/(app)/messages/[id].tsx can't be bypassed
-- by hitting PostgREST directly.
drop policy if exists "messages insert as sender in own conversation" on messages;
drop policy if exists "messages insert as sender, not blocked"        on messages;
create policy "messages insert as sender, not blocked"
  on messages for insert to authenticated with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
    and not exists (
      select 1
      from conversations c, blocks b
      where c.id = conversation_id
        and b.blocker_id = auth.uid()
        and b.blocked_id in (c.participant_a, c.participant_b)
    )
  );

-- Profiles: a profile is hidden from the caller only when the other
-- party blocked the caller. Profiles the caller has blocked stay
-- visible to the caller so they can find and unblock them from the
-- Blocked users list. Caller can always see their own profile.
drop policy if exists "profiles readable by authenticated" on profiles;
drop policy if exists "profiles readable minus blocks"     on profiles;
create policy "profiles readable minus blocks"
  on profiles for select to authenticated using (
    auth.uid() = profiles.id
    or not exists (
      select 1 from blocks b
      where b.blocker_id = profiles.id and b.blocked_id = auth.uid()
    )
  );
