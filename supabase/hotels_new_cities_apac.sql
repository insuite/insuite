-- =====================================================
-- Hotels catalog — new APAC cities expansion.
--
-- Adds 7 cities not previously in the catalog: Beijing, Macau, Kuala
-- Lumpur, Osaka, Hanoi, Ho Chi Minh City, Mumbai. ~47 properties total.
--
-- Tier filter: LUXURY only (Grand Hyatt and above) — same cut as
-- hotels_grand_hyatt_plus.sql. Excludes Sheraton / Westin / standard
-- Marriott / Renaissance / Le Méridien / Hyatt Regency / standard
-- Hilton / Hotel Indigo / Sofitel (regular) / Pullman / MGallery /
-- Mövenpick / voco / Kimpton.
--
-- Hotel naming uses each brand's official styling (Macao vs Macau is
-- a coin flip — many properties use "Macao" in their official name
-- while the city itself is "Macau" in common usage; city column
-- normalised to "Macau"). Ho Chi Minh City as the city column;
-- properties keep "Saigon" in their branded name.
--
-- Idempotent — only inserts unseen (name, city) pairs.
-- =====================================================

insert into hotels (name, city, country)
select * from (values
  -- ============ Beijing ============
  ('Aman at Summer Palace, Beijing',                   'Beijing',        'China'),
  ('Bulgari Hotel Beijing',                            'Beijing',        'China'),
  ('Mandarin Oriental Wangfujing, Beijing',            'Beijing',        'China'),
  ('The Peninsula Beijing',                            'Beijing',        'China'),
  ('Rosewood Beijing',                                 'Beijing',        'China'),
  ('Waldorf Astoria Beijing',                          'Beijing',        'China'),
  ('Park Hyatt Beijing',                               'Beijing',        'China'),
  ('Grand Hyatt Beijing',                              'Beijing',        'China'),
  ('The St. Regis Beijing',                            'Beijing',        'China'),
  ('The Ritz-Carlton, Beijing',                        'Beijing',        'China'),

  -- ============ Macau ============
  ('Mandarin Oriental, Macau',                         'Macau',          'China'),
  ('The Ritz-Carlton, Macau',                          'Macau',          'China'),
  ('Banyan Tree Macau',                                'Macau',          'China'),
  ('Four Seasons Hotel Macao, Cotai Strip',            'Macau',          'China'),
  ('Grand Hyatt Macau',                                'Macau',          'China'),
  ('The St. Regis Macao, Cotai Strip',                 'Macau',          'China'),
  ('Raffles at Galaxy Macau',                          'Macau',          'China'),
  ('W Macau – Studio City',                            'Macau',          'China'),

  -- ============ Kuala Lumpur ============
  ('The Ritz-Carlton, Kuala Lumpur',                   'Kuala Lumpur',   'Malaysia'),
  ('Mandarin Oriental, Kuala Lumpur',                  'Kuala Lumpur',   'Malaysia'),
  ('Four Seasons Hotel Kuala Lumpur',                  'Kuala Lumpur',   'Malaysia'),
  ('The St. Regis Kuala Lumpur',                       'Kuala Lumpur',   'Malaysia'),
  ('W Kuala Lumpur',                                   'Kuala Lumpur',   'Malaysia'),
  ('Banyan Tree Kuala Lumpur',                         'Kuala Lumpur',   'Malaysia'),
  ('Shangri-La Kuala Lumpur',                          'Kuala Lumpur',   'Malaysia'),
  ('Grand Hyatt Kuala Lumpur',                         'Kuala Lumpur',   'Malaysia'),

  -- ============ Osaka ============
  ('The Ritz-Carlton, Osaka',                          'Osaka',          'Japan'),
  ('Conrad Osaka',                                     'Osaka',          'Japan'),
  ('The St. Regis Osaka',                              'Osaka',          'Japan'),
  ('Four Seasons Hotel Osaka',                         'Osaka',          'Japan'),
  ('W Osaka',                                          'Osaka',          'Japan'),
  ('InterContinental Osaka',                           'Osaka',          'Japan'),

  -- ============ Hanoi ============
  ('Sofitel Legend Metropole Hanoi',                   'Hanoi',          'Vietnam'),
  ('Capella Hanoi',                                    'Hanoi',          'Vietnam'),
  ('JW Marriott Hotel Hanoi',                          'Hanoi',          'Vietnam'),
  ('InterContinental Hanoi Westlake',                  'Hanoi',          'Vietnam'),

  -- ============ Ho Chi Minh City ============
  ('Park Hyatt Saigon',                                'Ho Chi Minh City','Vietnam'),
  ('The Reverie Saigon',                               'Ho Chi Minh City','Vietnam'),
  ('InterContinental Saigon',                          'Ho Chi Minh City','Vietnam'),

  -- ============ Mumbai ============
  ('The Taj Mahal Palace, Mumbai',                     'Mumbai',         'India'),
  ('The Oberoi, Mumbai',                               'Mumbai',         'India'),
  ('Four Seasons Hotel Mumbai',                        'Mumbai',         'India'),
  ('The St. Regis Mumbai',                             'Mumbai',         'India'),
  ('JW Marriott Mumbai Sahar',                         'Mumbai',         'India'),
  ('JW Marriott Mumbai Juhu',                          'Mumbai',         'India'),
  ('The Leela Mumbai',                                 'Mumbai',         'India'),
  ('Grand Hyatt Mumbai',                               'Mumbai',         'India')
) as h(name, city, country)
where not exists (
  select 1 from hotels
  where hotels.name = h.name and hotels.city = h.city
);
