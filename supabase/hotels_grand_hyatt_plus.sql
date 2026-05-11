-- =====================================================
-- Hotels catalog — Grand Hyatt-tier-and-above expansion.
-- Fills brand gaps within the existing 26 cities only.
--
-- Tier filter: LUXURY (Grand Hyatt and above). Excludes everything
-- below — no Sheraton / Westin / Marriott / Renaissance / Le Méridien /
-- Hyatt Regency / Hyatt Centric / standard Hilton / Hotel Indigo /
-- Curio / Autograph / Tribute / Sofitel (regular) / Pullman / MGallery /
-- Mövenpick / voco / Kimpton — those already live in hotels_chains.sql
-- and aren't being grown further at this pass.
--
-- Brands included:
--   Hyatt:     Park Hyatt, Grand Hyatt, Andaz, Alila, Janu (Aman sister)
--   Marriott:  Ritz-Carlton, Ritz-Carlton Reserve, St. Regis, JW Marriott,
--              EDITION, W, Bulgari, Luxury Collection
--   Hilton:    Waldorf Astoria, Conrad, LXR
--   IHG:       Six Senses, Regent, InterContinental (selected)
--   Accor:     Raffles, Fairmont, Banyan Tree, Sofitel Legend
--   Indep/luxury chains: Mandarin Oriental, Four Seasons, Peninsula,
--              Aman, Rosewood, Capella, Cheval Blanc, Anantara, Soneva,
--              Joali, One&Only, Patina, COMO, Belmond, Rocco Forte,
--              Dorchester Collection, Maybourne, Armani, Shangri-La,
--              Kempinski, Langham, Pendry, 1 Hotels, Address, Jumeirah,
--              Crown, Hoshinoya, Roku LXR, Lungarno Portrait.
--
-- Idempotent: only inserts (name, city) pairs not already present, so this
-- can be re-run safely. Names follow each operator's official styling.
-- =====================================================

insert into hotels (name, city, country)
select * from (values
  -- ============ Tokyo ============
  ('Janu Tokyo',                                       'Tokyo',          'Japan'),
  ('Hoshinoya Tokyo',                                  'Tokyo',          'Japan'),
  ('The Okura Tokyo',                                  'Tokyo',          'Japan'),

  -- ============ Kyoto ============
  ('Six Senses Kyoto',                                 'Kyoto',          'Japan'),
  ('Banyan Tree Higashiyama Kyoto',                    'Kyoto',          'Japan'),
  ('Roku Kyoto, LXR Hotels & Resorts',                 'Kyoto',          'Japan'),
  ('Hoshinoya Kyoto',                                  'Kyoto',          'Japan'),

  -- ============ Hong Kong ============
  ('Regent Hong Kong',                                 'Hong Kong',      'China'),
  ('The St. Regis Hong Kong',                          'Hong Kong',      'China'),
  ('The Langham, Hong Kong',                           'Hong Kong',      'China'),

  -- ============ Bangkok ============
  ('Waldorf Astoria Bangkok',                          'Bangkok',        'Thailand'),
  ('Banyan Tree Bangkok',                              'Bangkok',        'Thailand'),
  ('Anantara Siam Bangkok Hotel',                      'Bangkok',        'Thailand'),
  ('Sindhorn Kempinski Hotel Bangkok',                 'Bangkok',        'Thailand'),
  ('The Sukhothai Bangkok',                            'Bangkok',        'Thailand'),
  ('The Standard, Bangkok Mahanakhon',                 'Bangkok',        'Thailand'),

  -- ============ Bali ============
  ('Four Seasons Resort Bali at Jimbaran Bay',         'Bali',           'Indonesia'),
  ('Amandari',                                         'Bali',           'Indonesia'),
  ('Amankila',                                         'Bali',           'Indonesia'),
  ('Mandapa, a Ritz-Carlton Reserve',                  'Bali',           'Indonesia'),
  ('Capella Ubud, Bali',                               'Bali',           'Indonesia'),
  ('Six Senses Uluwatu, Bali',                         'Bali',           'Indonesia'),
  ('Raffles Bali',                                     'Bali',           'Indonesia'),
  ('The Apurva Kempinski Bali',                        'Bali',           'Indonesia'),
  ('Alila Villas Uluwatu',                             'Bali',           'Indonesia'),
  ('Alila Ubud',                                       'Bali',           'Indonesia'),

  -- ============ Phuket ============
  ('Anantara Mai Khao Phuket Villas',                  'Phuket',         'Thailand'),
  ('COMO Point Yamu, Phuket',                          'Phuket',         'Thailand'),

  -- ============ Maldives ============
  ('Soneva Jani',                                      'Maldives',       'Maldives'),
  ('Joali Maldives',                                   'Maldives',       'Maldives'),
  ('One&Only Reethi Rah',                              'Maldives',       'Maldives'),
  ('Patina Maldives, Fari Islands',                    'Maldives',       'Maldives'),
  ('Anantara Kihavah Maldives Villas',                 'Maldives',       'Maldives'),

  -- ============ Seoul ============
  ('JOSUN Palace, A Luxury Collection Hotel, Seoul Gangnam','Seoul',     'South Korea'),
  ('Banyan Tree Club & Spa Seoul',                     'Seoul',          'South Korea'),

  -- ============ Shanghai ============
  ('The Middle House',                                 'Shanghai',       'China'),
  ('Capella Shanghai, Jian Ye Li',                     'Shanghai',       'China'),
  ('The Shanghai EDITION',                             'Shanghai',       'China'),
  ('The PuLi Hotel and Spa',                           'Shanghai',       'China'),

  -- ============ Dubai ============
  ('One&Only Royal Mirage',                            'Dubai',          'United Arab Emirates'),
  ('Atlantis The Palm',                                'Dubai',          'United Arab Emirates'),
  ('The Lana, Dorchester Collection',                  'Dubai',          'United Arab Emirates'),
  ('Address Downtown Dubai',                           'Dubai',          'United Arab Emirates'),
  ('Jumeirah Beach Hotel',                             'Dubai',          'United Arab Emirates'),

  -- ============ Abu Dhabi ============
  ('Rosewood Abu Dhabi',                               'Abu Dhabi',      'United Arab Emirates'),
  ('The Abu Dhabi EDITION',                            'Abu Dhabi',      'United Arab Emirates'),
  ('Jumeirah at Saadiyat Island Resort',               'Abu Dhabi',      'United Arab Emirates'),

  -- ============ London ============
  ('The Peninsula London',                             'London',         'United Kingdom'),
  ('Mandarin Oriental Mayfair, London',                'London',         'United Kingdom'),
  ('Four Seasons Hotel London at Park Lane',           'London',         'United Kingdom'),
  ('Bulgari Hotel London',                             'London',         'United Kingdom'),
  ('Rosewood London',                                  'London',         'United Kingdom'),
  ('The London EDITION',                               'London',         'United Kingdom'),
  ('The Langham, London',                              'London',         'United Kingdom'),
  ('Brown''s Hotel, A Rocco Forte Hotel',              'London',         'United Kingdom'),

  -- ============ Paris ============
  ('The Peninsula Paris',                              'Paris',          'France'),
  ('Four Seasons Hotel George V, Paris',               'Paris',          'France'),
  ('Bulgari Hotel Paris',                              'Paris',          'France'),
  ('Shangri-La Paris',                                 'Paris',          'France'),
  ('Le Royal Monceau, Raffles Paris',                  'Paris',          'France'),

  -- ============ Rome ============
  ('Six Senses Rome',                                  'Rome',           'Italy'),
  ('Bulgari Hotel Roma',                               'Rome',           'Italy'),
  ('Rocco Forte Hotel de la Ville Rome',               'Rome',           'Italy'),

  -- ============ Milan ============
  ('Armani Hotel Milano',                              'Milan',          'Italy'),
  ('Portrait Milano',                                  'Milan',          'Italy'),

  -- ============ Florence ============
  ('Belmond Villa San Michele',                        'Florence',       'Italy'),
  ('Portrait Firenze',                                 'Florence',       'Italy'),

  -- ============ Madrid ============
  ('The Madrid EDITION',                               'Madrid',         'Spain'),
  ('JW Marriott Hotel Madrid',                         'Madrid',         'Spain'),

  -- ============ Barcelona ============
  ('El Palace Barcelona',                              'Barcelona',      'Spain'),

  -- ============ Zurich ============
  ('Widder Hotel Zürich',                              'Zurich',         'Switzerland'),

  -- ============ New York ============
  ('Mandarin Oriental, New York',                      'New York',       'United States'),
  ('Baccarat Hotel and Residences New York',           'New York',       'United States'),
  ('The New York EDITION',                             'New York',       'United States'),
  ('Equinox Hotel Hudson Yards New York',              'New York',       'United States'),
  ('The Plaza Hotel',                                  'New York',       'United States'),

  -- ============ Beverly Hills / Los Angeles ============
  ('The Maybourne Beverly Hills',                      'Beverly Hills',  'United States'),
  ('Pendry West Hollywood',                            'Los Angeles',    'United States'),
  ('L''Ermitage Beverly Hills',                        'Beverly Hills',  'United States'),
  ('Sunset Tower Hotel',                               'Los Angeles',    'United States'),
  ('Chateau Marmont',                                  'Los Angeles',    'United States'),
  ('Mr. C Beverly Hills',                              'Beverly Hills',  'United States'),

  -- ============ Miami Beach ============
  ('1 Hotel South Beach',                              'Miami Beach',    'United States'),
  ('The Miami Beach EDITION',                          'Miami Beach',    'United States'),

  -- ============ San Francisco ============
  ('1 Hotel San Francisco',                            'San Francisco',  'United States'),

  -- ============ Sydney ============
  ('Crown Towers Sydney',                              'Sydney',         'Australia'),
  ('Shangri-La Sydney',                                'Sydney',         'Australia'),
  ('The Langham, Sydney',                              'Sydney',         'Australia'),
  ('InterContinental Sydney Double Bay',               'Sydney',         'Australia')
) as h(name, city, country)
where not exists (
  select 1 from hotels
  where hotels.name = h.name and hotels.city = h.city
);
