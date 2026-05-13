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
--   * The `current_user_is_admin()` helper below is required, not
--     cosmetic. An inline `exists (select 1 from profiles ...)` inside
--     a policy ON profiles itself triggers Postgres' RLS recursion
--     guard (42P17 "infinite recursion detected in policy for
--     relation profiles"). Wrapping the lookup in a SECURITY DEFINER
--     function makes it run as the function owner (postgres), which
--     bypasses RLS for the lookup and breaks the loop. The other
--     admin_* migrations get away with the inline pattern because
--     their policies are on different tables.
--
-- Idempotent — safe to re-run.
-- =====================================================

-- 0. SECURITY DEFINER helper. Runs as the function owner (postgres),
--    bypassing RLS for the profiles read; returns false (not null)
--    when there's no profile row, so the policies stay strict.
--    `set search_path = public` blocks the CVE-2018-1058 style
--    schema-injection attack on SECURITY DEFINER functions.
create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;

-- 1. messages: admin can SELECT regardless of conversation participation.
--    Without this, /admin/reports' deep-link into the reported chat
--    thread loads zero rows because the existing
--    "messages visible minus blocks" policy filters by participant.
drop policy if exists "messages admin read" on messages;
create policy "messages admin read"
  on messages for select to authenticated
  using ( public.current_user_is_admin() );

-- 2. messages: admin can DELETE any single message. There's no DELETE
--    policy in the base schema (messages aren't user-deletable), so this
--    is admin-only. Used for inappropriate-message takedown.
drop policy if exists "messages admin delete" on messages;
create policy "messages admin delete"
  on messages for delete to authenticated
  using ( public.current_user_is_admin() );

-- 3. conversations: admin can SELECT any. Mirrors policy 1 — needed so
--    the chat-thread deep-link can load the participant context (whose
--    chat is this) before listing messages.
drop policy if exists "conversations admin read" on conversations;
create policy "conversations admin read"
  on conversations for select to authenticated
  using ( public.current_user_is_admin() );

-- 4. activities: admin override of update + delete. The existing
--    "activities update own" / "activities delete own" stay in place
--    for hosts; these add the admin path on top.
drop policy if exists "activities admin update" on activities;
create policy "activities admin update"
  on activities for update to authenticated
  using ( public.current_user_is_admin() )
  with check ( public.current_user_is_admin() );

drop policy if exists "activities admin delete" on activities;
create policy "activities admin delete"
  on activities for delete to authenticated
  using ( public.current_user_is_admin() );

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
  using ( public.current_user_is_admin() )
  with check ( public.current_user_is_admin() );
