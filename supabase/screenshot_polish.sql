-- =====================================================
-- Screenshot polish + bulletproof cleanup.
--
-- Sequence:
--   1. Run screenshot_fixtures_run.sql to insert the 8 [ss]-prefixed
--      fixture activities.
--   2. Right before shooting, run STEP A here to strip the [ss] prefix
--      so the cards read clean.
--   3. Take all the screenshots you need.
--   4. Run STEP B here (uncomment) to delete the fixture rows. It matches
--      by exact note text in BOTH prefixed and stripped form, so it
--      works regardless of which step you forgot to run.
-- =====================================================

-- ────────────────────────────────────────────────────────────────────
-- STEP A: BEFORE shooting — strip the `[ss] ` prefix.
-- ────────────────────────────────────────────────────────────────────

update activities
set note = substring(note from length('[ss] ') + 1)
where note like '[ss] %';

-- Sanity check: should return 8 rows, none starting with `[ss]`.
-- select id, venue, note from activities
-- where note in (
--   'Looking for breakfast company at the executive lounge.',
--   'Easy laps then sun on the deck. Up for a chat.',
--   'Sushi at the bar, then drinks if you''re game.',
--   'Nightcap at The Peter. Quiet conversation welcome.',
--   'Hammam then tea on the lounge floor.',
--   'Light morning lift. Happy to spot.',
--   'Window seat at Girandole. Bring a book if you like.',
--   'Kaiseki at Musashi. Anyone enjoying solo travel welcome.'
-- );

-- ────────────────────────────────────────────────────────────────────
-- STEP B: AFTER shooting — cleanup. Uncomment and run.
--
-- Matches each fixture note both with and without the `[ss] ` prefix,
-- so it doesn't matter whether STEP A ran. Profile restore is
-- separately listed below — paste your STEP 0 snapshot in.
-- ────────────────────────────────────────────────────────────────────

-- delete from activities where note in (
--   -- stripped form (after STEP A)
--   'Looking for breakfast company at the executive lounge.',
--   'Easy laps then sun on the deck. Up for a chat.',
--   'Sushi at the bar, then drinks if you''re game.',
--   'Nightcap at The Peter. Quiet conversation welcome.',
--   'Hammam then tea on the lounge floor.',
--   'Light morning lift. Happy to spot.',
--   'Window seat at Girandole. Bring a book if you like.',
--   'Kaiseki at Musashi. Anyone enjoying solo travel welcome.',
--   -- prefixed form (in case STEP A was skipped)
--   '[ss] Looking for breakfast company at the executive lounge.',
--   '[ss] Easy laps then sun on the deck. Up for a chat.',
--   '[ss] Sushi at the bar, then drinks if you''re game.',
--   '[ss] Nightcap at The Peter. Quiet conversation welcome.',
--   '[ss] Hammam then tea on the lounge floor.',
--   '[ss] Light morning lift. Happy to spot.',
--   '[ss] Window seat at Girandole. Bring a book if you like.',
--   '[ss] Kaiseki at Musashi. Anyone enjoying solo travel welcome.'
-- );

-- Restore Julian's profile (replace placeholders with the values you saved
-- in STEP 0 of screenshot_fixtures_run.sql).
-- update profiles set
--   first_name = '<REAL_FIRSTNAME_JULIAN>',
--   bio        = '<REAL_BIO_OR_NULL>',
--   languages  = '{...}',
--   open_to    = '{...}'
-- where id = '42b2c446-cebb-414d-a72d-a5f7f69e1e00';

-- Restore Yuko's profile.
-- update profiles set
--   first_name = '<REAL_FIRSTNAME_YUKO>',
--   bio        = '<REAL_BIO_OR_NULL>',
--   languages  = '{...}',
--   open_to    = '{...}'
-- where id = '86f758e6-92aa-48ec-91f9-ff422ba18427';
