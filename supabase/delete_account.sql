-- =====================================================
-- Account deletion — run once in Supabase SQL Editor.
-- Apple App Store requires accounts to be deletable in-app.
--
-- Strategy: delete the auth.users row. All public tables that reference
-- profiles(id) (which references auth.users on delete cascade) are wired with
-- ON DELETE CASCADE in schema.sql, so deleting the auth user cleanly removes:
--   profiles, activities, join_requests, conversations, messages,
--   passes, referrals, conversation_reads
--
-- Storage files (avatars/{uid}/...) are NOT cascaded — the client deletes
-- those before calling this RPC.
-- =====================================================

create or replace function delete_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'Not signed in';
  end if;

  -- Cascading delete via auth.users → profiles → everything that references it
  delete from auth.users where id = v_caller;
end;
$$;

revoke all on function delete_account() from public;
grant execute on function delete_account() to authenticated;
