-- =====================================================
-- App Store screenshot fixtures — paste-ready run.
--
-- HOST1 = Julian  → 42b2c446-cebb-414d-a72d-a5f7f69e1e00
-- HOST2 = Yuko    → 86f758e6-92aa-48ec-91f9-ff422ba18427
--
-- Run order: STEP 0 (snapshot) → STEP 1 (rename) → STEP 2 (insert) →
-- take screenshots → STEP 3 (cleanup, uncomment & run).
-- =====================================================

-- ────────────────────────────────────────────────────────────────────
-- STEP 0 (recommended): snapshot the current first_name / bio / langs /
-- open_to of both hosts so you can restore them after screenshots.
-- Run this on its own first and copy the result somewhere safe.
-- ────────────────────────────────────────────────────────────────────

-- select id, first_name, bio, languages, open_to from profiles
-- where id in (
--   '42b2c446-cebb-414d-a72d-a5f7f69e1e00',
--   '86f758e6-92aa-48ec-91f9-ff422ba18427'
-- );

-- ────────────────────────────────────────────────────────────────────
-- STEP 1: temporarily set the screenshot personas.
-- Skip this block if you'd rather use the real first_names already on file.
-- ────────────────────────────────────────────────────────────────────

update profiles set
  first_name = 'Julian',
  bio        = 'Two weeks in Tokyo. Open to breakfasts, lounge nights, and a swim.',
  languages  = '{en,fr}',
  open_to    = '{breakfast,pool,lounge,dinner,spa}'
where id = '42b2c446-cebb-414d-a72d-a5f7f69e1e00';

update profiles set
  first_name = 'Yuko',
  bio        = 'Tokyo-based, often traveling solo. Quiet conversations welcome.',
  languages  = '{en,ja}',
  open_to    = '{pool,gym,lounge,dinner}'
where id = '86f758e6-92aa-48ec-91f9-ff422ba18427';

-- ────────────────────────────────────────────────────────────────────
-- STEP 2: insert 8 active Tokyo activities. Note prefix `[ss]` is the
-- marker for cleanup — don't strip it.
-- ────────────────────────────────────────────────────────────────────

insert into activities (host_id, hotel_id, venue, date, time_from, time_to, note, max_spots, status)
values
  -- Julian · breakfast · Aman Tokyo · tomorrow 8–9am
  ('42b2c446-cebb-414d-a72d-a5f7f69e1e00'::uuid,
   (select id from hotels where name = 'Aman Tokyo' limit 1),
   'breakfast', current_date + 1, '08:00', '09:00',
   '[ss] Looking for breakfast company at the executive lounge.',
   3, 'active'),

  -- Yuko · pool · Park Hyatt Tokyo · today 4–5:30pm
  ('86f758e6-92aa-48ec-91f9-ff422ba18427'::uuid,
   (select id from hotels where name = 'Park Hyatt Tokyo' limit 1),
   'pool', current_date, '16:00', '17:30',
   '[ss] Easy laps then sun on the deck. Up for a chat.',
   3, 'active'),

  -- Julian · dinner · The Tokyo EDITION, Toranomon · upcoming Saturday 7:30–9:30pm
  ('42b2c446-cebb-414d-a72d-a5f7f69e1e00'::uuid,
   (select id from hotels where name = 'The Tokyo EDITION, Toranomon' limit 1),
   'dinner',
   (current_date + ((6 - extract(dow from current_date)::int + 7) % 7))::date,
   '19:30', '21:30',
   '[ss] Sushi at the bar, then drinks if you''re game.',
   3, 'active'),

  -- Yuko · lounge · The Peninsula Tokyo · today 7–8:30pm
  ('86f758e6-92aa-48ec-91f9-ff422ba18427'::uuid,
   (select id from hotels where name = 'The Peninsula Tokyo' limit 1),
   'lounge', current_date, '19:00', '20:30',
   '[ss] Nightcap at The Peter. Quiet conversation welcome.',
   3, 'active'),

  -- Julian · spa · Mandarin Oriental Tokyo · upcoming Sunday 3–4:30pm
  ('42b2c446-cebb-414d-a72d-a5f7f69e1e00'::uuid,
   (select id from hotels where name = 'Mandarin Oriental Tokyo' limit 1),
   'spa',
   (current_date + ((0 - extract(dow from current_date)::int + 7) % 7 + 7))::date,
   '15:00', '16:30',
   '[ss] Hammam then tea on the lounge floor.',
   2, 'active'),

  -- Yuko · gym · Bulgari Hotel Tokyo · tomorrow 7–8am
  ('86f758e6-92aa-48ec-91f9-ff422ba18427'::uuid,
   (select id from hotels where name = 'Bulgari Hotel Tokyo' limit 1),
   'gym', current_date + 1, '07:00', '08:00',
   '[ss] Light morning lift. Happy to spot.',
   2, 'active'),

  -- Julian · breakfast · Park Hyatt Tokyo · day after tomorrow 9–10am
  ('42b2c446-cebb-414d-a72d-a5f7f69e1e00'::uuid,
   (select id from hotels where name = 'Park Hyatt Tokyo' limit 1),
   'breakfast', current_date + 2, '09:00', '10:00',
   '[ss] Window seat at Girandole. Bring a book if you like.',
   3, 'active'),

  -- Yuko · dinner · Aman Tokyo · upcoming Saturday 8–9:30pm
  ('86f758e6-92aa-48ec-91f9-ff422ba18427'::uuid,
   (select id from hotels where name = 'Aman Tokyo' limit 1),
   'dinner',
   (current_date + ((6 - extract(dow from current_date)::int + 7) % 7))::date,
   '20:00', '21:30',
   '[ss] Kaiseki at Musashi. Anyone enjoying solo travel welcome.',
   3, 'active');

-- ────────────────────────────────────────────────────────────────────
-- STEP 3 (after screenshots): cleanup. Uncomment the block, paste the
-- snapshotted values from STEP 0 into the restore statements, run.
-- ────────────────────────────────────────────────────────────────────

-- delete from activities where note like '[ss]%';
--
-- update profiles set
--   first_name = '<REAL_FIRSTNAME_JULIAN_ACCOUNT>',
--   bio        = '<REAL_BIO_OR_NULL>',
--   languages  = '{...}',
--   open_to    = '{...}'
-- where id = '42b2c446-cebb-414d-a72d-a5f7f69e1e00';
--
-- update profiles set
--   first_name = '<REAL_FIRSTNAME_YUKO_ACCOUNT>',
--   bio        = '<REAL_BIO_OR_NULL>',
--   languages  = '{...}',
--   open_to    = '{...}'
-- where id = '86f758e6-92aa-48ec-91f9-ff422ba18427';
