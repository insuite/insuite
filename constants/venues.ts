export type VenueKey = 'pool' | 'gym' | 'lounge' | 'breakfast' | 'spa' | 'dinner';

export interface Venue {
  key: VenueKey;
  label: string;
  icon: string;
  description: string;
}

export const venues: Venue[] = [
  { key: 'pool', label: 'Pool', icon: 'water-outline', description: 'Poolside & sun loungers' },
  { key: 'gym', label: 'Gym', icon: 'barbell-outline', description: 'Fitness centre' },
  { key: 'lounge', label: 'Executive Lounge', icon: 'wine-outline', description: 'Club & executive lounge' },
  { key: 'breakfast', label: 'Breakfast', icon: 'cafe-outline', description: 'Morning dining' },
  { key: 'spa', label: 'Spa', icon: 'flower-outline', description: 'Spa & wellness' },
  { key: 'dinner', label: 'Dinner', icon: 'restaurant-outline', description: 'Evening dining' },
];

export const venueMap: Record<VenueKey, Venue> = venues.reduce(
  (acc, v) => ({ ...acc, [v.key]: v }),
  {} as Record<VenueKey, Venue>,
);

export const venueFilters: { key: VenueKey | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  ...venues.map((v) => ({ key: v.key, label: v.label })),
];
