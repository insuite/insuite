-- =====================================================
-- Blocked-users fixture — Julian has blocked Yuko.
--
-- Drives the Profile → Blocked users management screen
-- (app/(app)/profile/blocked.tsx) so you can verify the list, the
-- "blocked Xm ago" relative-time label, and the Unblock action against
-- a real Supabase row.
--
--   HOST1 = Julian = 42b2c446-cebb-414d-a72d-a5f7f69e1e00  (the blocker)
--   HOST2 = Yuko   = 86f758e6-92aa-48ec-91f9-ff422ba18427  (the blocked)
--
-- Pre-flight:
--   - schema.sql + blocks_and_reports.sql must be applied.
--   - The two profiles must already exist (they do once you've signed
--     in as both hosts via Apple at least once).
--
-- Use:
--   1. Run STEP 1 below to create the block row.
--   2. Sign in as Julian on the device.
--   3. Profile tab → "Blocked users" — you should see exactly one row
--      ("Yuko", "Blocked just now").
--   4. Tap Unblock → confirm. The row should disappear from the list
--      and the underlying blocks row should be gone (verify with the
--      sanity SELECT in STEP 3).
--
-- Side effects to be aware of while the block is active:
--   - Yuko's activities are hidden from Julian's Discover feed.
--   - Yuko's messages disappear from the Julian↔Yuko chat thread —
--     i.e. the thread set up by chat_fixtures_run.sql will look
--     half-empty when signed in as Julian. This is the RLS behaviour
--     working as designed; it is not a bug.
--   - To exercise the chat fixture again, run STEP 2 (cleanup) first.
--
-- Cleanup:
--   - STEP 2 below removes the block row. It is also safe to leave the
--     row in place — the Unblock button in the UI removes it, which
--     is part of what this fixture is meant to test.
-- =====================================================

-- ────────────────────────────────────────────────────────────────────
-- STEP 1: insert the block. ON CONFLICT no-op so re-running is safe;
-- the timestamp is preserved across re-runs (won't be reset to now()).
-- ────────────────────────────────────────────────────────────────────

insert into blocks (blocker_id, blocked_id)
values (
  '42b2c446-cebb-414d-a72d-a5f7f69e1e00'::uuid,  -- Julian (blocker)
  '86f758e6-92aa-48ec-91f9-ff422ba18427'::uuid   -- Yuko (blocked)
)
on conflict (blocker_id, blocked_id) do nothing;

-- Sanity check: should return exactly one row.
-- select b.blocker_id, b.blocked_id, b.created_at,
--        p.first_name as blocked_first_name
-- from blocks b
-- join profiles p on p.id = b.blocked_id
-- where b.blocker_id = '42b2c446-cebb-414d-a72d-a5f7f69e1e00'::uuid;


-- ────────────────────────────────────────────────────────────────────
-- STEP 2: cleanup — uncomment and run to remove the block row.
-- ────────────────────────────────────────────────────────────────────

-- delete from blocks
-- where blocker_id = '42b2c446-cebb-414d-a72d-a5f7f69e1e00'::uuid
--   and blocked_id = '86f758e6-92aa-48ec-91f9-ff422ba18427'::uuid;


-- ────────────────────────────────────────────────────────────────────
-- STEP 3 (optional): older-timestamp variant.
--
-- Re-runs of STEP 1 don't change created_at, but if you want the list
-- to render "5d ago" instead of "just now" on a fresh row, run STEP 2
-- first to clear the row, then run this block to insert with a
-- back-dated timestamp. This is the only way to exercise the relative-
-- time formatter past the "just now" branch without waiting.
-- ────────────────────────────────────────────────────────────────────

-- insert into blocks (blocker_id, blocked_id, created_at)
-- values (
--   '42b2c446-cebb-414d-a72d-a5f7f69e1e00'::uuid,
--   '86f758e6-92aa-48ec-91f9-ff422ba18427'::uuid,
--   now() - interval '5 days'
-- )
-- on conflict (blocker_id, blocked_id) do nothing;
