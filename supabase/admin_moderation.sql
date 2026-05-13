-- =====================================================
-- Admin moderation RLS.
--
-- Pair to admin_role.sql + admin_reports.sql. Where those open the
-- admin queues (hotels CRUD, hotel_requests, reports), this file gives
-- admins the actions they need to actually remediate a report:
--
--   * Read any conversation / message               (so the chat-thread
--                                                    deep-link from a
--                                                    reported message
--                                                    actually loads)
--   * Cancel or delete any activity                 (host-side actions
--                                                    extended to admin)
--   * Delete any message                            (single-message
--                                                    takedown without
--                                                    nuking the chat)
--   * Update any profile                            (clear bio /
--                                                    avatar_url for
--                                                    inappropriate
--                                                    user content)
--
-- Notes:
--   * messages has no UPDATE policy at all (no edit feature), and we're
--     not adding one. Admin moderation = delete, not edit.
--   * profiles.is_admin is still locked by the BEFORE UPDATE trigger
--     in admin_role.sql even when an admin owns the row, so this
--     "admin can update any profile" policy can't be used to promote
--     someone or self-promote. Verified in admin_moderation_verify.sql.
--   * No new policies on conversations.delete / activities.update —
--     deletes cascade from activities (the schema FKs handle it), and
--     the admin "cancel activity" path uses the existing UPDATE policy
--     extended below.
--
-- Idempotent — safe to re-run.
-- =====================================================

-- 1. messages: admin can SELECT regardless of conversation participation.
--    Without this, /admin/reports' deep-link into the reported chat
--    thread loads zero rows because the existing
--    "messages visible minus blocks" policy filters by participant.
drop policy if exists "messages admin read" on messages;
create policy "messages admin read"
  on messages for select to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- 2. messages: admin can DELETE any single message. There's no DELETE
--    policy in the base schema (messages aren't user-deletable), so this
--    is admin-only. Used for inappropriate-message takedown.
drop policy if exists "messages admin delete" on messages;
create policy "messages admin delete"
  on messages for delete to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- 3. conversations: admin can SELECT any. Mirrors policy 1 — needed so
--    the chat-thread deep-link can load the participant context (whose
--    chat is this) before listing messages.
drop policy if exists "conversations admin read" on conversations;
create policy "conversations admin read"
  on conversations for select to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- 4. activities: admin override of update + delete. The existing
--    "activities update own" / "activities delete own" stay in place
--    for hosts; these add the admin path on top.
drop policy if exists "activities admin update" on activities;
create policy "activities admin update"
  on activities for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "activities admin delete" on activities;
create policy "activities admin delete"
  on activities for delete to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- 5. profiles: admin can UPDATE any row. The existing
--    "profiles update own" policy stays for self-edit. The is_admin
--    trigger from admin_role.sql still rejects any change to is_admin
--    that doesn't come from postgres / service_role, so an admin
--    promoting themselves or each other is still blocked.
--
--    The mobile UI only exposes Clear Avatar / Clear Bio, but the policy
--    is column-agnostic on purpose — if we add another moderation field
--    later (e.g. soft-delete flag), it just works.
drop policy if exists "profiles admin update" on profiles;
create policy "profiles admin update"
  on profiles for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
