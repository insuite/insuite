-- Seed the hotels catalog. Safe to re-run — only inserts hotels whose
-- (name, city) pair isn't already present.

insert into hotels (name, city, country)
select * from (values
  ('Raffles Singapore',          'Singapore', 'Singapore'),
  ('Marina Bay Sands',           'Singapore', 'Singapore'),
  ('The Fullerton Hotel',        'Singapore', 'Singapore'),
  ('Mandarin Oriental Singapore','Singapore', 'Singapore'),
  ('The Peninsula Hong Kong',    'Hong Kong', 'China'),
  ('Four Seasons Hong Kong',     'Hong Kong', 'China'),
  ('Mandarin Oriental Hong Kong','Hong Kong', 'China'),
  ('The Ritz-Carlton Tokyo',     'Tokyo',     'Japan'),
  ('Park Hyatt Tokyo',           'Tokyo',     'Japan'),
  ('Aman Tokyo',                 'Tokyo',     'Japan'),
  ('Mandarin Oriental Taipei',   'Taipei',    'Taiwan'),
  ('Palais de Chine',            'Taipei',    'Taiwan')
) as h(name, city, country)
where not exists (
  select 1 from hotels
  where hotels.name = h.name and hotels.city = h.city
);
