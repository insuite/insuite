-- =====================================================
-- Hotels catalog — chain expansion (Marriott / Hyatt / IHG / Hilton / Accor).
-- Tier: LUXURY + UPSCALE only.
--   Marriott:  Ritz-Carlton, St. Regis, JW Marriott, EDITION, W,
--              Bulgari, Luxury Collection, Westin, Sheraton, Marriott,
--              Renaissance, Le Méridien, Autograph Collection,
--              Tribute Portfolio
--   Hyatt:     Park Hyatt, Andaz, Alila, Grand Hyatt, Hyatt Regency,
--              Hyatt Centric, Unbound Collection
--   IHG:       InterContinental, Six Senses, Regent, Kimpton,
--              Hotel Indigo, Vignette Collection, voco
--   Hilton:    Waldorf Astoria, Conrad, LXR, Curio Collection,
--              Hilton, DoubleTree, Embassy Suites, Canopy
--   Accor:     Raffles, Orient Express, Fairmont, Sofitel Legend, SO/,
--              Banyan Tree, Sofitel, Pullman, MGallery, Mövenpick,
--              Mondrian, Swissôtel
-- Excluded: budget / midscale (Aloft, Courtyard, Hampton, Holiday Inn,
--           Hyatt Place, Ibis, Novotel, etc.).
--
-- Coverage: the same 26 cities as hotels_expansion.sql.
-- Idempotent — only inserts (name, city) pairs that don't already exist.
-- Property names are best-effort; review in the dashboard before approving
-- any stale entries (a few brands have rebranded or closed since 2024).
-- =====================================================

insert into hotels (name, city, country)
select * from (values
  -- ============ Tokyo ============
  ('Conrad Tokyo',                                     'Tokyo',          'Japan'),
  ('Andaz Tokyo Toranomon Hills',                      'Tokyo',          'Japan'),
  ('Grand Hyatt Tokyo',                                'Tokyo',          'Japan'),
  ('Hyatt Regency Tokyo',                              'Tokyo',          'Japan'),
  ('Hilton Tokyo',                                     'Tokyo',          'Japan'),
  ('The Westin Tokyo',                                 'Tokyo',          'Japan'),
  ('Sheraton Grande Tokyo Bay Hotel',                  'Tokyo',          'Japan'),
  ('The Strings by InterContinental Tokyo',            'Tokyo',          'Japan'),
  ('ANA InterContinental Tokyo',                       'Tokyo',          'Japan'),
  ('Pullman Tokyo Tamachi',                            'Tokyo',          'Japan'),
  ('The Tokyo Station Hotel, Autograph Collection',    'Tokyo',          'Japan'),
  ('The Prince Gallery Tokyo Kioicho, A Luxury Collection Hotel','Tokyo','Japan'),

  -- ============ Kyoto ============
  ('Hyatt Regency Kyoto',                              'Kyoto',          'Japan'),
  ('The Westin Miyako Kyoto',                          'Kyoto',          'Japan'),

  -- ============ Hong Kong ============
  ('Conrad Hong Kong',                                 'Hong Kong',      'China'),
  ('Grand Hyatt Hong Kong',                            'Hong Kong',      'China'),
  ('Hyatt Regency Hong Kong, Tsim Sha Tsui',           'Hong Kong',      'China'),
  ('JW Marriott Hotel Hong Kong',                      'Hong Kong',      'China'),
  ('The Ritz-Carlton, Hong Kong',                      'Hong Kong',      'China'),
  ('Sheraton Hong Kong Hotel & Towers',                'Hong Kong',      'China'),
  ('W Hong Kong',                                      'Hong Kong',      'China'),
  ('Hotel Indigo Hong Kong Island',                    'Hong Kong',      'China'),
  ('InterContinental Grand Stanford Hong Kong',        'Hong Kong',      'China'),

  -- ============ Singapore ============
  ('Conrad Centennial Singapore',                      'Singapore',      'Singapore'),
  ('Grand Hyatt Singapore',                            'Singapore',      'Singapore'),
  ('Hyatt Regency Singapore',                          'Singapore',      'Singapore'),
  ('Andaz Singapore',                                  'Singapore',      'Singapore'),
  ('The St. Regis Singapore',                          'Singapore',      'Singapore'),
  ('The Ritz-Carlton, Millenia Singapore',             'Singapore',      'Singapore'),
  ('JW Marriott Hotel Singapore South Beach',          'Singapore',      'Singapore'),
  ('W Singapore – Sentosa Cove',                       'Singapore',      'Singapore'),
  ('Sheraton Towers Singapore',                        'Singapore',      'Singapore'),
  ('The Westin Singapore',                             'Singapore',      'Singapore'),
  ('Hilton Singapore Orchard',                         'Singapore',      'Singapore'),
  ('InterContinental Singapore',                       'Singapore',      'Singapore'),
  ('Sofitel Singapore Sentosa Resort & Spa',           'Singapore',      'Singapore'),
  ('Pullman Singapore Hill Street',                    'Singapore',      'Singapore'),
  ('Mondrian Singapore Duxton',                        'Singapore',      'Singapore'),

  -- ============ Taipei ============
  ('Grand Hyatt Taipei',                               'Taipei',         'Taiwan'),
  ('JW Marriott Taipei',                               'Taipei',         'Taiwan'),
  ('Sheraton Grand Taipei Hotel',                      'Taipei',         'Taiwan'),
  ('Le Méridien Taipei',                               'Taipei',         'Taiwan'),
  ('Hilton Taipei Sinban',                             'Taipei',         'Taiwan'),
  ('Hotel Indigo Taipei North',                        'Taipei',         'Taiwan'),

  -- ============ Bangkok ============
  ('Conrad Bangkok',                                   'Bangkok',        'Thailand'),
  ('Park Hyatt Bangkok',                               'Bangkok',        'Thailand'),
  ('Grand Hyatt Erawan Bangkok',                       'Bangkok',        'Thailand'),
  ('Hyatt Regency Bangkok Sukhumvit',                  'Bangkok',        'Thailand'),
  ('The St. Regis Bangkok',                            'Bangkok',        'Thailand'),
  ('JW Marriott Hotel Bangkok',                        'Bangkok',        'Thailand'),
  ('Sheraton Grande Sukhumvit, A Luxury Collection',   'Bangkok',        'Thailand'),
  ('W Bangkok',                                        'Bangkok',        'Thailand'),
  ('The Westin Grande Sukhumvit, Bangkok',             'Bangkok',        'Thailand'),
  ('The Athenee Hotel, A Luxury Collection',           'Bangkok',        'Thailand'),
  ('Renaissance Bangkok Ratchaprasong',                'Bangkok',        'Thailand'),
  ('Hilton Sukhumvit Bangkok',                         'Bangkok',        'Thailand'),
  ('Sofitel Bangkok Sukhumvit',                        'Bangkok',        'Thailand'),
  ('SO/ Bangkok',                                      'Bangkok',        'Thailand'),
  ('Pullman Bangkok King Power',                       'Bangkok',        'Thailand'),
  ('InterContinental Bangkok',                         'Bangkok',        'Thailand'),
  ('Le Méridien Bangkok',                              'Bangkok',        'Thailand'),

  -- ============ Bali ============
  ('Conrad Bali',                                      'Bali',           'Indonesia'),
  ('Andaz Bali',                                       'Bali',           'Indonesia'),
  ('Hyatt Regency Bali',                               'Bali',           'Indonesia'),
  ('The Ritz-Carlton, Bali',                           'Bali',           'Indonesia'),
  ('W Bali – Seminyak',                                'Bali',           'Indonesia'),
  ('The Westin Resort Nusa Dua, Bali',                 'Bali',           'Indonesia'),
  ('Renaissance Bali Uluwatu Resort & Spa',            'Bali',           'Indonesia'),
  ('Hilton Bali Resort',                               'Bali',           'Indonesia'),
  ('Sofitel Bali Nusa Dua Beach Resort',               'Bali',           'Indonesia'),
  ('Pullman Bali Legian Beach',                        'Bali',           'Indonesia'),
  ('Mövenpick Resort & Spa Jimbaran Bali',             'Bali',           'Indonesia'),
  ('InterContinental Bali Resort',                     'Bali',           'Indonesia'),
  ('Banyan Tree Ungasan, Bali',                        'Bali',           'Indonesia'),

  -- ============ Phuket ============
  ('JW Marriott Phuket Resort & Spa',                  'Phuket',         'Thailand'),
  ('Hyatt Regency Phuket Resort',                      'Phuket',         'Thailand'),
  ('The Westin Siray Bay Resort & Spa, Phuket',        'Phuket',         'Thailand'),
  ('Le Méridien Phuket Beach Resort',                  'Phuket',         'Thailand'),
  ('Sheraton Grande Laguna Phuket',                    'Phuket',         'Thailand'),
  ('Banyan Tree Phuket',                               'Phuket',         'Thailand'),
  ('Hilton Phuket Arcadia Resort & Spa',               'Phuket',         'Thailand'),
  ('Pullman Phuket Panwa Beach Resort',                'Phuket',         'Thailand'),
  ('InterContinental Phuket Resort',                   'Phuket',         'Thailand'),
  ('Renaissance Phuket Resort & Spa',                  'Phuket',         'Thailand'),

  -- ============ Maldives ============
  ('Conrad Maldives Rangali Island',                   'Maldives',       'Maldives'),
  ('Park Hyatt Maldives Hadahaa',                      'Maldives',       'Maldives'),
  ('W Maldives',                                       'Maldives',       'Maldives'),
  ('The Westin Maldives Miriandhoo Resort',            'Maldives',       'Maldives'),
  ('Le Méridien Maldives Resort & Spa',                'Maldives',       'Maldives'),
  ('The Ritz-Carlton Maldives, Fari Islands',          'Maldives',       'Maldives'),
  ('Sheraton Maldives Full Moon Resort & Spa',         'Maldives',       'Maldives'),
  ('JW Marriott Maldives Resort & Spa',                'Maldives',       'Maldives'),
  ('Hilton Maldives Amingiri Resort & Spa',            'Maldives',       'Maldives'),
  ('Waldorf Astoria Maldives Ithaafushi',              'Maldives',       'Maldives'),
  ('InterContinental Maldives Maamunagau Resort',      'Maldives',       'Maldives'),
  ('Fairmont Maldives Sirru Fen Fushi',                'Maldives',       'Maldives'),
  ('Raffles Maldives Meradhoo',                        'Maldives',       'Maldives'),
  ('Pullman Maldives Maamutaa',                        'Maldives',       'Maldives'),
  ('Banyan Tree Vabbinfaru',                           'Maldives',       'Maldives'),

  -- ============ Seoul ============
  ('Conrad Seoul',                                     'Seoul',          'South Korea'),
  ('Andaz Seoul Gangnam',                              'Seoul',          'South Korea'),
  ('Grand Hyatt Seoul',                                'Seoul',          'South Korea'),
  ('JW Marriott Hotel Seoul',                          'Seoul',          'South Korea'),
  ('JW Marriott Dongdaemun Square Seoul',              'Seoul',          'South Korea'),
  ('The Westin Josun Seoul',                           'Seoul',          'South Korea'),
  ('Sheraton Grande Walkerhill, Seoul',                'Seoul',          'South Korea'),
  ('Sofitel Ambassador Seoul',                         'Seoul',          'South Korea'),
  ('InterContinental Seoul COEX',                      'Seoul',          'South Korea'),
  ('Grand InterContinental Seoul Parnas',              'Seoul',          'South Korea'),
  ('Fairmont Ambassador Seoul',                        'Seoul',          'South Korea'),

  -- ============ Shanghai ============
  ('Conrad Shanghai',                                  'Shanghai',       'China'),
  ('Park Hyatt Shanghai',                              'Shanghai',       'China'),
  ('Grand Hyatt Shanghai',                             'Shanghai',       'China'),
  ('Andaz Xintiandi Shanghai',                         'Shanghai',       'China'),
  ('Hyatt Regency Shanghai Wujiaochang',               'Shanghai',       'China'),
  ('The St. Regis Shanghai Jingan',                    'Shanghai',       'China'),
  ('The Ritz-Carlton Shanghai, Pudong',                'Shanghai',       'China'),
  ('JW Marriott Hotel Shanghai at Tomorrow Square',    'Shanghai',       'China'),
  ('W Shanghai – The Bund',                            'Shanghai',       'China'),
  ('The Westin Bund Center, Shanghai',                 'Shanghai',       'China'),
  ('Sheraton Grand Shanghai Pudong',                   'Shanghai',       'China'),
  ('Hilton Shanghai Hongqiao',                         'Shanghai',       'China'),
  ('Waldorf Astoria Shanghai on the Bund',             'Shanghai',       'China'),
  ('Sofitel Shanghai Hongqiao',                        'Shanghai',       'China'),
  ('Pullman Shanghai South',                           'Shanghai',       'China'),
  ('InterContinental Shanghai NECC',                   'Shanghai',       'China'),
  ('Fairmont Peace Hotel',                             'Shanghai',       'China'),

  -- ============ Dubai ============
  ('Conrad Dubai',                                     'Dubai',          'United Arab Emirates'),
  ('Park Hyatt Dubai',                                 'Dubai',          'United Arab Emirates'),
  ('Grand Hyatt Dubai',                                'Dubai',          'United Arab Emirates'),
  ('Hyatt Regency Dubai',                              'Dubai',          'United Arab Emirates'),
  ('Andaz Dubai The Palm',                             'Dubai',          'United Arab Emirates'),
  ('The St. Regis Dubai, The Palm',                    'Dubai',          'United Arab Emirates'),
  ('The Ritz-Carlton, Dubai',                          'Dubai',          'United Arab Emirates'),
  ('The Ritz-Carlton, Dubai International Financial Centre','Dubai',     'United Arab Emirates'),
  ('JW Marriott Marquis Hotel Dubai',                  'Dubai',          'United Arab Emirates'),
  ('W Dubai – The Palm',                               'Dubai',          'United Arab Emirates'),
  ('The Westin Dubai Mina Seyahi Beach Resort & Marina','Dubai',         'United Arab Emirates'),
  ('Sheraton Grand Hotel, Dubai',                      'Dubai',          'United Arab Emirates'),
  ('Hilton Dubai Jumeirah',                            'Dubai',          'United Arab Emirates'),
  ('Waldorf Astoria Dubai Palm Jumeirah',              'Dubai',          'United Arab Emirates'),
  ('Sofitel Dubai Jumeirah Beach',                     'Dubai',          'United Arab Emirates'),
  ('Pullman Dubai Creek City Centre',                  'Dubai',          'United Arab Emirates'),
  ('InterContinental Dubai Festival City',             'Dubai',          'United Arab Emirates'),
  ('Raffles Dubai',                                    'Dubai',          'United Arab Emirates'),
  ('Fairmont Dubai',                                   'Dubai',          'United Arab Emirates'),
  ('Fairmont The Palm',                                'Dubai',          'United Arab Emirates'),

  -- ============ Abu Dhabi ============
  ('Conrad Abu Dhabi Etihad Towers',                   'Abu Dhabi',      'United Arab Emirates'),
  ('Park Hyatt Abu Dhabi Hotel and Villas',            'Abu Dhabi',      'United Arab Emirates'),
  ('Grand Hyatt Abu Dhabi Hotel',                      'Abu Dhabi',      'United Arab Emirates'),
  ('The St. Regis Saadiyat Island Resort, Abu Dhabi',  'Abu Dhabi',      'United Arab Emirates'),
  ('The Ritz-Carlton Abu Dhabi, Grand Canal',          'Abu Dhabi',      'United Arab Emirates'),
  ('W Abu Dhabi – Yas Island',                         'Abu Dhabi',      'United Arab Emirates'),
  ('The Westin Abu Dhabi Golf Resort & Spa',           'Abu Dhabi',      'United Arab Emirates'),
  ('Le Méridien Abu Dhabi',                            'Abu Dhabi',      'United Arab Emirates'),
  ('Sheraton Abu Dhabi Hotel & Resort',                'Abu Dhabi',      'United Arab Emirates'),
  ('Sofitel Abu Dhabi Corniche',                       'Abu Dhabi',      'United Arab Emirates'),
  ('InterContinental Abu Dhabi',                       'Abu Dhabi',      'United Arab Emirates'),
  ('Fairmont Bab Al Bahr',                             'Abu Dhabi',      'United Arab Emirates'),

  -- ============ London ============
  ('Conrad London St James',                           'London',         'United Kingdom'),
  ('Andaz London Liverpool Street',                    'London',         'United Kingdom'),
  ('Hyatt Regency London – The Churchill',             'London',         'United Kingdom'),
  ('Great Scotland Yard, A Hyatt Hotel',               'London',         'United Kingdom'),
  ('JW Marriott Grosvenor House London',               'London',         'United Kingdom'),
  ('JW Marriott Hotel London Park Lane',               'London',         'United Kingdom'),
  ('W London – Leicester Square',                      'London',         'United Kingdom'),
  ('The Westin London City',                           'London',         'United Kingdom'),
  ('Le Méridien Piccadilly',                           'London',         'United Kingdom'),
  ('Sheraton Grand London Park Lane',                  'London',         'United Kingdom'),
  ('London Hilton on Park Lane',                       'London',         'United Kingdom'),
  ('Hilton London Bankside',                           'London',         'United Kingdom'),
  ('Sofitel London St James',                          'London',         'United Kingdom'),
  ('Pullman London St Pancras',                        'London',         'United Kingdom'),
  ('InterContinental London Park Lane',                'London',         'United Kingdom'),
  ('InterContinental London – The O2',                 'London',         'United Kingdom'),
  ('Raffles London at The OWO',                        'London',         'United Kingdom'),

  -- ============ Paris ============
  ('Park Hyatt Paris-Vendôme',                         'Paris',          'France'),
  ('Hyatt Regency Paris Étoile',                       'Paris',          'France'),
  ('Hyatt Paris Madeleine, Hôtel',                     'Paris',          'France'),
  ('JW Marriott Hotel Paris Champs-Élysées',           'Paris',          'France'),
  ('W Paris – Opéra',                                  'Paris',          'France'),
  ('The Westin Paris-Vendôme',                         'Paris',          'France'),
  ('Le Méridien Etoile',                               'Paris',          'France'),
  ('Hilton Paris Opera',                               'Paris',          'France'),
  ('Sofitel Paris Le Faubourg',                        'Paris',          'France'),
  ('Sofitel Paris Le Scribe Opéra',                    'Paris',          'France'),
  ('Pullman Paris Tour Eiffel',                        'Paris',          'France'),
  ('Pullman Paris Montparnasse',                       'Paris',          'France'),
  ('InterContinental Paris Le Grand',                  'Paris',          'France'),
  ('InterContinental Paris-Champs Élysées Étoile',     'Paris',          'France'),

  -- ============ Rome ============
  ('W Rome',                                           'Rome',           'Italy'),
  ('The Westin Excelsior, Rome',                       'Rome',           'Italy'),
  ('Le Méridien Visconti Rome',                        'Rome',           'Italy'),
  ('Sheraton Roma Hotel & Conference Center',          'Rome',           'Italy'),
  ('Hilton Rome Airport',                              'Rome',           'Italy'),
  ('Sofitel Rome Villa Borghese',                      'Rome',           'Italy'),
  ('Pullman Roma EUR',                                 'Rome',           'Italy'),
  ('InterContinental Rome de la Ville',                'Rome',           'Italy'),
  ('Rome Cavalieri, A Waldorf Astoria Hotel',          'Rome',           'Italy'),
  ('Hyatt Centric Termini Roma',                       'Rome',           'Italy'),

  -- ============ Milan ============
  ('Hyatt Centric Milan Centrale',                     'Milan',          'Italy'),
  ('Andaz Milano',                                     'Milan',          'Italy'),
  ('The Westin Palace, Milan',                         'Milan',          'Italy'),
  ('Sheraton Diana Majestic Hotel',                    'Milan',          'Italy'),
  ('Hilton Milan',                                     'Milan',          'Italy'),
  ('Sofitel Milano Malpensa',                          'Milan',          'Italy'),
  ('Pullman Milano Centrale',                          'Milan',          'Italy'),
  ('Excelsior Hotel Gallia, A Luxury Collection',      'Milan',          'Italy'),

  -- ============ Florence ============
  ('The Westin Excelsior, Florence',                   'Florence',       'Italy'),

  -- ============ Madrid ============
  ('Hyatt Centric Gran Vía Madrid',                    'Madrid',         'Spain'),
  ('Andaz Madrid',                                     'Madrid',         'Spain'),
  ('The Westin Palace, Madrid',                        'Madrid',         'Spain'),
  ('Hilton Madrid Airport',                            'Madrid',         'Spain'),
  ('Sofitel Madrid Plaza de España',                   'Madrid',         'Spain'),
  ('InterContinental Madrid',                          'Madrid',         'Spain'),

  -- ============ Barcelona ============
  ('Hyatt Regency Barcelona Tower',                    'Barcelona',      'Spain'),
  ('JW Marriott Hotel Barcelona',                      'Barcelona',      'Spain'),
  ('The Westin Barcelona',                             'Barcelona',      'Spain'),
  ('Le Méridien Barcelona',                            'Barcelona',      'Spain'),
  ('Hilton Diagonal Mar Barcelona',                    'Barcelona',      'Spain'),
  ('Sofitel Barcelona Skipper',                        'Barcelona',      'Spain'),
  ('InterContinental Barcelona',                       'Barcelona',      'Spain'),

  -- ============ Zurich ============
  ('Park Hyatt Zurich',                                'Zurich',         'Switzerland'),
  ('Hyatt Regency Zurich Airport The Circle',          'Zurich',         'Switzerland'),
  ('Sheraton Zurich Hotel',                            'Zurich',         'Switzerland'),
  ('Hilton Zurich Airport',                            'Zurich',         'Switzerland'),

  -- ============ New York ============
  ('Conrad New York Downtown',                         'New York',       'United States'),
  ('Conrad New York Midtown',                          'New York',       'United States'),
  ('Park Hyatt New York',                              'New York',       'United States'),
  ('Andaz 5th Avenue',                                 'New York',       'United States'),
  ('Andaz Wall Street',                                'New York',       'United States'),
  ('The Ritz-Carlton New York, NoMad',                 'New York',       'United States'),
  ('The Ritz-Carlton New York, Central Park',          'New York',       'United States'),
  ('JW Marriott Essex House New York',                 'New York',       'United States'),
  ('W New York – Times Square',                        'New York',       'United States'),
  ('W New York – Union Square',                        'New York',       'United States'),
  ('The Westin New York at Times Square',              'New York',       'United States'),
  ('The Westin New York Grand Central',                'New York',       'United States'),
  ('Sheraton New York Times Square Hotel',             'New York',       'United States'),
  ('New York Marriott Marquis',                        'New York',       'United States'),
  ('Hilton New York Times Square',                     'New York',       'United States'),
  ('New York Hilton Midtown',                          'New York',       'United States'),
  ('Waldorf Astoria New York',                         'New York',       'United States'),
  ('Sofitel New York',                                 'New York',       'United States'),
  ('InterContinental New York Times Square',           'New York',       'United States'),
  ('InterContinental New York Barclay',                'New York',       'United States'),
  ('Le Méridien New York, Central Park',               'New York',       'United States'),

  -- ============ Beverly Hills / Los Angeles ============
  ('Conrad Los Angeles',                               'Los Angeles',    'United States'),
  ('Andaz West Hollywood',                             'Los Angeles',    'United States'),
  ('The Ritz-Carlton, Los Angeles',                    'Los Angeles',    'United States'),
  ('JW Marriott Los Angeles L.A. LIVE',                'Los Angeles',    'United States'),
  ('W Hollywood',                                      'Los Angeles',    'United States'),
  ('The Westin Bonaventure Hotel & Suites, Los Angeles','Los Angeles',   'United States'),
  ('Sofitel Los Angeles at Beverly Hills',             'Beverly Hills',  'United States'),
  ('The West Hollywood EDITION',                       'Los Angeles',    'United States'),
  ('InterContinental Los Angeles Downtown',            'Los Angeles',    'United States'),
  ('Fairmont Century Plaza',                           'Los Angeles',    'United States'),
  ('Hyatt Regency Los Angeles International Airport',  'Los Angeles',    'United States'),
  ('Sheraton Grand Los Angeles',                       'Los Angeles',    'United States'),

  -- ============ Miami Beach ============
  ('W South Beach',                                    'Miami Beach',    'United States'),
  ('The Confidante Miami Beach, Hyatt Unbound Collection','Miami Beach', 'United States'),
  ('Royal Palm South Beach Miami, A Tribute Portfolio Resort','Miami Beach','United States'),
  ('Cadillac Hotel & Beach Club, Autograph Collection','Miami Beach',    'United States'),

  -- ============ San Francisco ============
  ('Hyatt Regency San Francisco',                      'San Francisco',  'United States'),
  ('Grand Hyatt San Francisco',                        'San Francisco',  'United States'),
  ('The St. Regis San Francisco',                      'San Francisco',  'United States'),
  ('JW Marriott San Francisco Union Square',           'San Francisco',  'United States'),
  ('W San Francisco',                                  'San Francisco',  'United States'),
  ('The Westin St. Francis San Francisco on Union Square','San Francisco','United States'),
  ('Palace Hotel, San Francisco',                      'San Francisco',  'United States'),
  ('Hilton San Francisco Union Square',                'San Francisco',  'United States'),
  ('InterContinental San Francisco',                   'San Francisco',  'United States'),
  ('InterContinental Mark Hopkins San Francisco',      'San Francisco',  'United States'),
  ('Fairmont San Francisco',                           'San Francisco',  'United States'),

  -- ============ Sydney ============
  ('Hyatt Regency Sydney',                             'Sydney',         'Australia'),
  ('W Sydney',                                         'Sydney',         'Australia'),
  ('Sheraton Grand Sydney Hyde Park',                  'Sydney',         'Australia'),
  ('Hilton Sydney',                                    'Sydney',         'Australia'),
  ('Sofitel Sydney Darling Harbour',                   'Sydney',         'Australia'),
  ('Pullman Sydney Hyde Park',                         'Sydney',         'Australia'),
  ('InterContinental Sydney',                          'Sydney',         'Australia'),
  ('The Fullerton Hotel Sydney',                       'Sydney',         'Australia')
) as h(name, city, country)
where not exists (
  select 1 from hotels
  where hotels.name = h.name and hotels.city = h.city
);
