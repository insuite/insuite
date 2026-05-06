import type { VenueKey } from './venues';

export interface PlaceholderGuest {
  id: string;
  firstName: string;
  initial: string;
  avatarUri: string | null;
}

export interface PlaceholderHost {
  id: string;
  firstName: string;
  initial: string;
  bio: string;
  languages: { code: string; flag: string; name: string }[];
  avatarUri: string | null;
}

export type ActivityStatus = 'active' | 'cancelled' | 'completed';

export interface PlaceholderActivity {
  id: string;
  venue: VenueKey;
  host: PlaceholderHost;
  hotelName: string;
  hotelCity: string;
  dateIso: string;
  dateLabel: string;
  timeFrom: string;
  timeTo: string;
  note: string;
  status: ActivityStatus;
  spotsTotal: number;
  spotsTaken: number;
  joinedGuests: PlaceholderGuest[];
}

export const PLACEHOLDER_ACTIVITIES: PlaceholderActivity[] = [
  {
    id: '1',
    venue: 'breakfast',
    host: {
      id: 'u-emma',
      firstName: 'Emma',
      initial: 'E',
      bio: 'Marketing consultant, in town for a conference. Love a slow morning with good coffee.',
      languages: [
        { code: 'en', flag: '🇬🇧', name: 'English' },
        { code: 'fr', flag: '🇫🇷', name: 'Français' },
      ],
      avatarUri: 'https://i.pravatar.cc/200?img=47',
    },
    hotelName: 'Raffles Singapore',
    hotelCity: 'Singapore',
    dateIso: '2026-05-01',
    dateLabel: 'Tomorrow',
    timeFrom: '08:00',
    timeTo: '09:30',
    note: 'In town for a conference — happy to share a quiet breakfast.',
    status: 'active',
    spotsTotal: 3,
    spotsTaken: 1,
    joinedGuests: [
      {
        id: 'g-tom',
        firstName: 'Tom',
        initial: 'T',
        avatarUri: 'https://i.pravatar.cc/200?img=15',
      },
    ],
  },
  {
    id: '2',
    venue: 'lounge',
    host: {
      id: 'u-kenji',
      firstName: 'Kenji',
      initial: 'K',
      bio: 'Tokyo-based architect. In Singapore for three nights, up for quiet conversation.',
      languages: [
        { code: 'ja', flag: '🇯🇵', name: '日本語' },
        { code: 'en', flag: '🇬🇧', name: 'English' },
      ],
      avatarUri: 'https://i.pravatar.cc/200?img=33',
    },
    hotelName: 'Marina Bay Sands',
    hotelCity: 'Singapore',
    dateIso: '2026-04-30',
    dateLabel: 'Today',
    timeFrom: '18:30',
    timeTo: '20:00',
    note: 'Evening drinks before dinner. Any company welcome.',
    status: 'active',
    spotsTotal: 3,
    spotsTaken: 2,
    joinedGuests: [
      { id: 'g-anna', firstName: 'Anna', initial: 'A', avatarUri: null },
      {
        id: 'g-leo',
        firstName: 'Leo',
        initial: 'L',
        avatarUri: 'https://i.pravatar.cc/200?img=8',
      },
    ],
  },
  {
    id: '3',
    venue: 'gym',
    host: {
      id: 'u-marcus',
      firstName: 'Marcus',
      initial: 'M',
      bio: 'Runner, climber, occasional yogi. Travelling for work across Asia.',
      languages: [{ code: 'en', flag: '🇬🇧', name: 'English' }],
      avatarUri: null,
    },
    hotelName: 'The Fullerton Hotel',
    hotelCity: 'Singapore',
    dateIso: '2026-05-04',
    dateLabel: 'Sat 26 Apr',
    timeFrom: '07:00',
    timeTo: '08:00',
    note: 'Functional training, moderate pace. Spotter appreciated.',
    status: 'active',
    spotsTotal: 2,
    spotsTaken: 0,
    joinedGuests: [],
  },
];

export function findPlaceholderActivity(id: string) {
  return PLACEHOLDER_ACTIVITIES.find((a) => a.id === id) ?? null;
}
