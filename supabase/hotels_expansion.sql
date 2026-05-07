-- =====================================================
-- Hotels catalog — global luxury expansion (v2).
-- Idempotent: inserts only (name, city) pairs not already present, so this
-- can be re-run safely after the initial seed.sql.
--
-- Curated list. Skews toward properties that match InSuite's positioning:
-- Aman, Bulgari, Mandarin Oriental, Four Seasons, Peninsula, Park Hyatt,
-- Ritz-Carlton, Rosewood, Capella, Six Senses, Cheval Blanc, plus
-- destination-defining independents (The Mark, Burj Al Arab, Claridge's,
-- The Beverly Hills Hotel, etc.).
-- =====================================================

insert into hotels (name, city, country)
select * from (values
  -- Tokyo (existing: Ritz-Carlton, Park Hyatt, Aman)
  ('Mandarin Oriental Tokyo',                    'Tokyo',         'Japan'),
  ('Four Seasons Hotel Tokyo at Otemachi',       'Tokyo',         'Japan'),
  ('The Peninsula Tokyo',                        'Tokyo',         'Japan'),
  ('The Tokyo EDITION, Toranomon',               'Tokyo',         'Japan'),
  ('Bulgari Hotel Tokyo',                        'Tokyo',         'Japan'),

  -- Kyoto
  ('Aman Kyoto',                                 'Kyoto',         'Japan'),
  ('The Ritz-Carlton Kyoto',                     'Kyoto',         'Japan'),
  ('Four Seasons Hotel Kyoto',                   'Kyoto',         'Japan'),
  ('Park Hyatt Kyoto',                           'Kyoto',         'Japan'),
  ('HOTEL THE MITSUI KYOTO',                     'Kyoto',         'Japan'),

  -- Hong Kong (existing: Peninsula, Four Seasons, Mandarin Oriental)
  ('Rosewood Hong Kong',                         'Hong Kong',     'China'),
  ('The Upper House',                            'Hong Kong',     'China'),
  ('The Murray, Hong Kong',                      'Hong Kong',     'China'),
  ('The Landmark Mandarin Oriental',             'Hong Kong',     'China'),

  -- Singapore (existing: Raffles, Marina Bay Sands, Fullerton, Mandarin Oriental)
  ('The Capitol Kempinski Hotel Singapore',      'Singapore',     'Singapore'),
  ('Capella Singapore',                          'Singapore',     'Singapore'),
  ('The Fullerton Bay Hotel Singapore',          'Singapore',     'Singapore'),

  -- Taipei (existing: Mandarin Oriental, Palais de Chine)
  ('Shangri-La Far Eastern, Taipei',             'Taipei',        'Taiwan'),
  ('Regent Taipei',                              'Taipei',        'Taiwan'),
  ('W Taipei',                                   'Taipei',        'Taiwan'),

  -- Bangkok
  ('The Peninsula Bangkok',                      'Bangkok',       'Thailand'),
  ('Mandarin Oriental Bangkok',                  'Bangkok',       'Thailand'),
  ('The Siam',                                   'Bangkok',       'Thailand'),
  ('Capella Bangkok',                            'Bangkok',       'Thailand'),
  ('Four Seasons Hotel Bangkok at Chao Phraya River','Bangkok',   'Thailand'),
  ('Rosewood Bangkok',                           'Bangkok',       'Thailand'),

  -- Bali
  ('Bulgari Resort Bali',                        'Bali',          'Indonesia'),
  ('COMO Shambhala Estate',                      'Bali',          'Indonesia'),
  ('Four Seasons Resort Bali at Sayan',          'Bali',          'Indonesia'),
  ('Aman Villas at Nusa Dua',                    'Bali',          'Indonesia'),
  ('The St. Regis Bali Resort',                  'Bali',          'Indonesia'),

  -- Phuket
  ('Trisara Phuket',                             'Phuket',        'Thailand'),
  ('Amanpuri',                                   'Phuket',        'Thailand'),
  ('Rosewood Phuket',                            'Phuket',        'Thailand'),
  ('The Naka Island, a Luxury Collection Resort','Phuket',        'Thailand'),

  -- Maldives (city = Maldives, no specific atoll)
  ('Cheval Blanc Randheli',                      'Maldives',      'Maldives'),
  ('Soneva Fushi',                               'Maldives',      'Maldives'),
  ('Six Senses Laamu',                           'Maldives',      'Maldives'),
  ('The St. Regis Maldives Vommuli Resort',      'Maldives',      'Maldives'),
  ('Velaa Private Island',                       'Maldives',      'Maldives'),

  -- Seoul
  ('The Shilla Seoul',                           'Seoul',         'South Korea'),
  ('Four Seasons Hotel Seoul',                   'Seoul',         'South Korea'),
  ('Park Hyatt Seoul',                           'Seoul',         'South Korea'),
  ('Signiel Seoul',                              'Seoul',         'South Korea'),

  -- Shanghai
  ('Bulgari Hotel Shanghai',                     'Shanghai',      'China'),
  ('The Peninsula Shanghai',                     'Shanghai',      'China'),
  ('Mandarin Oriental Pudong, Shanghai',         'Shanghai',      'China'),
  ('Aman Yangyun',                               'Shanghai',      'China'),

  -- Dubai
  ('Burj Al Arab Jumeirah',                      'Dubai',         'United Arab Emirates'),
  ('Atlantis The Royal',                         'Dubai',         'United Arab Emirates'),
  ('One&Only The Palm',                          'Dubai',         'United Arab Emirates'),
  ('Bulgari Resort Dubai',                       'Dubai',         'United Arab Emirates'),
  ('Mandarin Oriental Jumeira, Dubai',           'Dubai',         'United Arab Emirates'),
  ('Four Seasons Resort Dubai at Jumeirah Beach','Dubai',         'United Arab Emirates'),

  -- Abu Dhabi
  ('Emirates Palace Mandarin Oriental',          'Abu Dhabi',     'United Arab Emirates'),
  ('The St. Regis Abu Dhabi',                    'Abu Dhabi',     'United Arab Emirates'),
  ('Four Seasons Hotel Abu Dhabi at Al Maryah Island','Abu Dhabi','United Arab Emirates'),

  -- London
  ('Claridge''s',                                 'London',        'United Kingdom'),
  ('The Connaught',                              'London',        'United Kingdom'),
  ('The Savoy',                                  'London',        'United Kingdom'),
  ('The Ritz London',                            'London',        'United Kingdom'),
  ('The Lanesborough',                           'London',        'United Kingdom'),
  ('The Berkeley',                               'London',        'United Kingdom'),
  ('The Dorchester',                             'London',        'United Kingdom'),

  -- Paris
  ('Le Bristol Paris',                           'Paris',         'France'),
  ('Hôtel Plaza Athénée',                        'Paris',         'France'),
  ('Hôtel de Crillon',                           'Paris',         'France'),
  ('Cheval Blanc Paris',                         'Paris',         'France'),
  ('The Ritz Paris',                             'Paris',         'France'),
  ('Mandarin Oriental Paris',                    'Paris',         'France'),

  -- Rome
  ('Hotel de Russie, A Rocco Forte Hotel',       'Rome',          'Italy'),
  ('Hotel Eden',                                 'Rome',          'Italy'),
  ('The St. Regis Rome',                         'Rome',          'Italy'),
  ('Hotel Hassler Roma',                         'Rome',          'Italy'),

  -- Milan
  ('Bulgari Hotel Milano',                       'Milan',         'Italy'),
  ('Four Seasons Hotel Milano',                  'Milan',         'Italy'),
  ('Park Hyatt Milan',                           'Milan',         'Italy'),
  ('Mandarin Oriental, Milan',                   'Milan',         'Italy'),

  -- Florence
  ('Four Seasons Hotel Firenze',                 'Florence',      'Italy'),
  ('The St. Regis Florence',                     'Florence',      'Italy'),
  ('Hotel Savoy Florence',                       'Florence',      'Italy'),

  -- Madrid
  ('Mandarin Oriental Ritz, Madrid',             'Madrid',        'Spain'),
  ('Four Seasons Hotel Madrid',                  'Madrid',        'Spain'),
  ('Rosewood Villa Magna',                       'Madrid',        'Spain'),

  -- Barcelona
  ('Hotel Arts Barcelona',                       'Barcelona',     'Spain'),
  ('Mandarin Oriental Barcelona',                'Barcelona',     'Spain'),
  ('W Barcelona',                                'Barcelona',     'Spain'),

  -- Zurich
  ('Baur au Lac',                                'Zurich',        'Switzerland'),
  ('Dolder Grand',                               'Zurich',        'Switzerland'),

  -- New York
  ('The Mark',                                   'New York',      'United States'),
  ('Aman New York',                              'New York',      'United States'),
  ('Four Seasons Hotel New York Downtown',       'New York',      'United States'),
  ('The Peninsula New York',                     'New York',      'United States'),
  ('The St. Regis New York',                     'New York',      'United States'),
  ('The Carlyle, A Rosewood Hotel',              'New York',      'United States'),

  -- Beverly Hills / Los Angeles
  ('The Beverly Hills Hotel',                    'Beverly Hills', 'United States'),
  ('The Peninsula Beverly Hills',                'Beverly Hills', 'United States'),
  ('Four Seasons Hotel Los Angeles at Beverly Hills','Beverly Hills','United States'),
  ('Hotel Bel-Air',                              'Los Angeles',   'United States'),
  ('Waldorf Astoria Beverly Hills',              'Beverly Hills', 'United States'),

  -- Miami / Miami Beach
  ('The Setai',                                  'Miami Beach',   'United States'),
  ('Faena Hotel Miami Beach',                    'Miami Beach',   'United States'),
  ('The Ritz-Carlton, South Beach',              'Miami Beach',   'United States'),
  ('Four Seasons Hotel at The Surf Club',        'Miami Beach',   'United States'),

  -- San Francisco
  ('Four Seasons Hotel San Francisco',           'San Francisco', 'United States'),
  ('The Ritz-Carlton, San Francisco',            'San Francisco', 'United States'),
  ('Mandarin Oriental, San Francisco',           'San Francisco', 'United States'),

  -- Sydney
  ('Park Hyatt Sydney',                          'Sydney',        'Australia'),
  ('Capella Sydney',                             'Sydney',        'Australia'),
  ('Four Seasons Hotel Sydney',                  'Sydney',        'Australia')
) as h(name, city, country)
where not exists (
  select 1 from hotels
  where hotels.name = h.name and hotels.city = h.city
);
