export interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
}

// Placeholder luxury hotel list. Replace with Supabase `hotels` query later.
export const hotels: Hotel[] = [
  { id: 'sg-raffles', name: 'Raffles Singapore', city: 'Singapore', country: 'Singapore' },
  { id: 'sg-mbs', name: 'Marina Bay Sands', city: 'Singapore', country: 'Singapore' },
  { id: 'sg-fullerton', name: 'The Fullerton Hotel', city: 'Singapore', country: 'Singapore' },
  { id: 'sg-mo', name: 'Mandarin Oriental Singapore', city: 'Singapore', country: 'Singapore' },
  { id: 'hk-peninsula', name: 'The Peninsula Hong Kong', city: 'Hong Kong', country: 'China' },
  { id: 'hk-fs', name: 'Four Seasons Hong Kong', city: 'Hong Kong', country: 'China' },
  { id: 'hk-mo', name: 'Mandarin Oriental Hong Kong', city: 'Hong Kong', country: 'China' },
  { id: 'tk-rc', name: 'The Ritz-Carlton Tokyo', city: 'Tokyo', country: 'Japan' },
  { id: 'tk-park', name: 'Park Hyatt Tokyo', city: 'Tokyo', country: 'Japan' },
  { id: 'tk-aman', name: 'Aman Tokyo', city: 'Tokyo', country: 'Japan' },
  { id: 'tp-mo', name: 'Mandarin Oriental Taipei', city: 'Taipei', country: 'Taiwan' },
  { id: 'tp-palais', name: 'Palais de Chine', city: 'Taipei', country: 'Taiwan' },
];
