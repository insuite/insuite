-- =====================================================
-- App Store screenshot fixtures.
--
-- Pre-flight:
--   1. You need TWO god accounts — your primary, plus a second one
--      (with `is_unlimited = true` on profile). Both must have completed
--      onboarding so a profiles row exists.
--   2. Below, replace v_host1 / v_host2 with their UUIDs (Supabase
--      Authentication → Users → User UID).
--
-- What this gives you:
--   - 8 active activities in Tokyo, future-dated, split across 4 hotels and
--     6 venues, between v_host1 ("Sophie") and v_host2 ("Marco"). The mix
--     is tuned so a Tokyo Discover feed scrolls populated and varied.
--
-- After screenshots:
--   - Run the cleanup block at the bottom of this file. It removes only
--     the rows this fixture created (matched by note prefix), and restores
--     the original profile names if you saved them.
-- =====================================================

-- ────────────────────────────────────────────────────────────────────
-- STEP 1 (optional): temporarily rename the two host profiles so the
-- activity cards show "Sophie · EN · FR" / "Marco · EN · IT" rather than
-- your real first names. Skip this block if you're happy with your real
-- names showing on the cards.
-- ────────────────────────────────────────────────────────────────────

-- BEFORE running this, write down the current first_name / bio of each
-- host so you can restore them after screenshots:
--   select id, first_name, bio, languages, open_to from profiles
--   where id in ('<HOST1>', '<HOST2>');

update profiles set
  first_name = 'Sophie',
  bio        = 'Two weeks in Tokyo. Always up for breakfast.',
  languages  = '{en,fr}',
  open_to    = '{breakfast,pool,lounge,dinner,spa}'
where id = '<HOST1>';   -- ⬅ replace

update profiles set
  first_name = 'Marco',
  bio        = 'Mornings at the pool. Evenings in the lounge.',
  languages  = '{en,it}',
  open_to    = '{pool,gym,lounge,dinner}'
where id = '<HOST2>';   -- ⬅ replace

-- ────────────────────────────────────────────────────────────────────
-- STEP 2: Insert 8 fixture activities. Note prefix `[ss]` is what the
-- cleanup block uses to find them — don't remove it from the strings.
-- ────────────────────────────────────────────────────────────────────

insert into activities (host_id, hotel_id, venue, date, time_from, time_to, note, max_spots, status)
values
  -- Sophie · breakfast · Aman Tokyo · tomorrow 8–9am
  ('<HOST1>'::uuid,
   (select id from hotels where name = 'Aman Tokyo' limit 1),
   'breakfast', current_date + 1, '08:00', '09:00',
   '[ss] Looking for breakfast company at the executive lounge.',
   3, 'active'),

  -- Marco · pool · Park Hyatt Tokyo · today 4–5:30pm
  ('<HOST2>'::uuid,
   (select id from hotels where name = 'Park Hyatt Tokyo' limit 1),
   'pool', current_date, '16:00', '17:30',
   '[ss] Easy laps then sun on the deck. Up for a chat.',
   3, 'active'),

  -- Sophie · dinner · The Tokyo EDITION, Toranomon · Saturday 7:30–9:30pm
  ('<HOST1>'::uuid,
   (select id from hotels where name = 'The Tokyo EDITION, Toranomon' limit 1),
   'dinner',
   (current_date + ((6 - extract(dow from current_date)::int + 7) % 7))::date,
   '19:30', '21:30',
   '[ss] Sushi at the bar, then drinks if you''re game.',
   3, 'active'),

  -- Marco · lounge · The Peninsula Tokyo · today 7–8:30pm
  ('<HOST2>'::uuid,
   (select id from hotels where name = 'The Peninsula Tokyo' limit 1),
   'lounge', current_date, '19:00', '20:30',
   '[ss] Nightcap at The Peter. Quiet conversation welcome.',
   3, 'active'),

  -- Sophie · spa · Mandarin Oriental Tokyo · Sunday 3–4:30pm
  ('<HOST1>'::uuid,
   (select id from hotels where name = 'Mandarin Oriental Tokyo' limit 1),
   'spa',
   (current_date + ((0 - extract(dow from current_date)::int + 7) % 7 + 7))::date,
   '15:00', '16:30',
   '[ss] Hammam then tea on the lounge floor.',
   2, 'active'),

  -- Marco · gym · Bulgari Hotel Tokyo · tomorrow 7–8am
  ('<HOST2>'::uuid,
   (select id from hotels where name = 'Bulgari Hotel Tokyo' limit 1),
   'gym', current_date + 1, '07:00', '08:00',
   '[ss] Light morning lift. Happy to spot.',
   2, 'active'),

  -- Sophie · breakfast · Park Hyatt Tokyo · day after tomorrow 9–10am
  ('<HOST1>'::uuid,
   (select id from hotels where name = 'Park Hyatt Tokyo' limit 1),
   'breakfast', current_date + 2, '09:00', '10:00',
   '[ss] Window seat at Girandole. Bring a book if you like.',
   3, 'active'),

  -- Marco · dinner · Aman Tokyo · Saturday 8–9:30pm
  ('<HOST2>'::uuid,
   (select id from hotels where name = 'Aman Tokyo' limit 1),
   'dinner',
   (current_date + ((6 - extract(dow from current_date)::int + 7) % 7))::date,
   '20:00', '21:30',
   '[ss] Kaiseki at Musashi. Anyone enjoying solo travel welcome.',
   3, 'active');

-- ────────────────────────────────────────────────────────────────────
-- STEP 3 (after screenshots): cleanup. Uncomment, run, done.
-- ────────────────────────────────────────────────────────────────────

-- delete from activities where note like '[ss]%';
--
-- -- Optional: restore your real first_name / bio / etc. for both hosts.
-- -- Replace the placeholder text with what you saved in step 1's "BEFORE"
-- -- query, then run.
-- update profiles set
--   first_name = '<REAL_FIRSTNAME_1>',
--   bio        = '<REAL_BIO_1_OR_NULL>',
--   languages  = '{...}',
--   open_to    = '{...}'
-- where id = '<HOST1>';
--
-- update profiles set
--   first_name = '<REAL_FIRSTNAME_2>',
--   bio        = '<REAL_BIO_2_OR_NULL>',
--   languages  = '{...}',
--   open_to    = '{...}'
-- where id = '<HOST2>';
