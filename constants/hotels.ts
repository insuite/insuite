export interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
}

// Demo fallback. Only used when Supabase isn't configured (local dev
// without env) or when a `listHotels()` network call fails. Production
// reads the full ~500-row catalog from the `hotels` table. This list
// just needs enough breadth to make city chips + search look populated
// during demo / screenshot mode.
//
// Hand-curated cross-section across the cities the app skews to. Keeps
// the existing 12 names that placeholder activities (constants/
// placeholderActivities.ts) reference by hotel name.
export const hotels: Hotel[] = [
  // Singapore (existing 4)
  { id: 'sg-raffles',   name: 'Raffles Singapore',          city: 'Singapore', country: 'Singapore' },
  { id: 'sg-mbs',       name: 'Marina Bay Sands',           city: 'Singapore', country: 'Singapore' },
  { id: 'sg-fullerton', name: 'The Fullerton Hotel',        city: 'Singapore', country: 'Singapore' },
  { id: 'sg-mo',        name: 'Mandarin Oriental Singapore', city: 'Singapore', country: 'Singapore' },

  // Hong Kong (existing 3)
  { id: 'hk-peninsula', name: 'The Peninsula Hong Kong',     city: 'Hong Kong', country: 'China' },
  { id: 'hk-fs',        name: 'Four Seasons Hong Kong',      city: 'Hong Kong', country: 'China' },
  { id: 'hk-mo',        name: 'Mandarin Oriental Hong Kong', city: 'Hong Kong', country: 'China' },

  // Tokyo (existing 3 + Peninsula)
  { id: 'tk-rc',        name: 'The Ritz-Carlton Tokyo',      city: 'Tokyo',     country: 'Japan' },
  { id: 'tk-park',      name: 'Park Hyatt Tokyo',            city: 'Tokyo',     country: 'Japan' },
  { id: 'tk-aman',      name: 'Aman Tokyo',                  city: 'Tokyo',     country: 'Japan' },
  { id: 'tk-peninsula', name: 'The Peninsula Tokyo',         city: 'Tokyo',     country: 'Japan' },

  // Kyoto
  { id: 'ky-aman',      name: 'Aman Kyoto',                  city: 'Kyoto',     country: 'Japan' },
  { id: 'ky-rc',        name: 'The Ritz-Carlton Kyoto',      city: 'Kyoto',     country: 'Japan' },

  // Taipei (existing 2 + Regent + Grand Hyatt)
  { id: 'tp-mo',        name: 'Mandarin Oriental Taipei',    city: 'Taipei',    country: 'Taiwan' },
  { id: 'tp-palais',    name: 'Palais de Chine',             city: 'Taipei',    country: 'Taiwan' },
  { id: 'tp-regent',    name: 'Regent Taipei',               city: 'Taipei',    country: 'Taiwan' },
  { id: 'tp-gh',        name: 'Grand Hyatt Taipei',          city: 'Taipei',    country: 'Taiwan' },

  // Bangkok
  { id: 'bk-peninsula', name: 'The Peninsula Bangkok',       city: 'Bangkok',   country: 'Thailand' },
  { id: 'bk-capella',   name: 'Capella Bangkok',             city: 'Bangkok',   country: 'Thailand' },

  // Bali
  { id: 'bl-aman',      name: 'Aman Villas at Nusa Dua',     city: 'Bali',      country: 'Indonesia' },
  { id: 'bl-fs',        name: 'Four Seasons Resort Bali at Sayan', city: 'Bali', country: 'Indonesia' },

  // Maldives
  { id: 'mv-soneva',    name: 'Soneva Fushi',                city: 'Maldives',  country: 'Maldives' },
  { id: 'mv-cheval',    name: 'Cheval Blanc Randheli',       city: 'Maldives',  country: 'Maldives' },

  // Seoul
  { id: 'se-fs',        name: 'Four Seasons Hotel Seoul',    city: 'Seoul',     country: 'South Korea' },

  // Dubai
  { id: 'db-burj',      name: 'Burj Al Arab Jumeirah',       city: 'Dubai',     country: 'United Arab Emirates' },
  { id: 'db-atlantis',  name: 'Atlantis The Royal',          city: 'Dubai',     country: 'United Arab Emirates' },

  // London
  { id: 'ln-peninsula', name: 'The Peninsula London',        city: 'London',    country: 'United Kingdom' },
  { id: 'ln-claridge',  name: "Claridge's",                  city: 'London',    country: 'United Kingdom' },

  // Paris
  { id: 'pa-peninsula', name: 'The Peninsula Paris',         city: 'Paris',     country: 'France' },
  { id: 'pa-bristol',   name: 'Le Bristol Paris',            city: 'Paris',     country: 'France' },

  // New York
  { id: 'ny-aman',      name: 'Aman New York',               city: 'New York',  country: 'United States' },

  // Beverly Hills
  { id: 'bh-bh',        name: 'The Beverly Hills Hotel',     city: 'Beverly Hills', country: 'United States' },

  // Sydney
  { id: 'sy-park',      name: 'Park Hyatt Sydney',           city: 'Sydney',    country: 'Australia' },
];
