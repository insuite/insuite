# InSuite — CLAUDE.md

## Product Overview

InSuite is a mobile-first social app for solo luxury hotel guests to find company for shared hotel facilities (pool, gym, executive lounge, breakfast, spa, dinner) with other guests in the same city. The app is iOS-first, built with React Native (Expo), with a Supabase backend.

Brand name: **InSuite**
Design language: Dark luxury — deep charcoal backgrounds (#0f0e0c), gold accent (#c9b98a), minimal typography, no gradients.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Mobile framework | React Native via Expo (SDK 51+) |
| Navigation | Expo Router (file-based routing) |
| Backend / Database | Supabase (Postgres + Realtime + Auth) |
| Authentication | Apple Sign-In only (via `expo-apple-authentication`) |
| Payments | RevenueCat (iOS in-app purchase) |
| Push notifications | Expo Notifications |
| State management | Zustand |
| Styling | StyleSheet (no Tailwind — RN only) |

---

## File Structure

```
insuite/
├── CLAUDE.md
├── app/
│   ├── _layout.tsx               # Root layout, auth gate
│   ├── (auth)/
│   │   ├── welcome.tsx           # Welcome + Sign in with Apple
│   │   └── onboarding/
│   │       ├── name.tsx          # Step 1: First name
│   │       ├── languages.tsx     # Step 2: Languages
│   │       ├── activities.tsx    # Step 3: Activities
│   │       └── bio.tsx           # Step 4: Bio (optional)
│   └── (app)/
│       ├── _layout.tsx           # Tab navigator
│       ├── discover.tsx          # Discover tab
│       ├── activities/
│       │   ├── index.tsx         # My activities list
│       │   ├── new/
│       │   │   ├── hotel.tsx     # Step 1: Select hotel
│       │   │   ├── venue.tsx     # Step 2: Select venue
│       │   │   ├── datetime.tsx  # Step 3: Date & time
│       │   │   └── confirm.tsx   # Step 4: Confirm & publish
│       │   └── [id].tsx          # Activity detail
│       ├── messages/
│       │   ├── index.tsx         # Conversations list
│       │   └── [id].tsx          # Chat thread
│       └── profile/
│           ├── index.tsx         # Profile view
│           └── edit/
│               ├── index.tsx     # Edit menu
│               ├── name.tsx
│               ├── bio.tsx
│               ├── languages.tsx
│               ├── activities.tsx
│               └── vibe.tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx            # Primary, ghost variants
│   │   ├── Card.tsx
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   ├── LanguagePicker.tsx
│   │   ├── VenuePicker.tsx
│   │   └── MiniCalendar.tsx
│   ├── activity/
│   │   ├── ActivityCard.tsx      # Used in Discover feed
│   │   └── ActivityDetail.tsx
│   └── messaging/
│       ├── ChatBubble.tsx
│       └── MessageInput.tsx
├── lib/
│   ├── supabase.ts               # Supabase client
│   ├── auth.ts                   # Apple sign-in logic
│   ├── revenuecat.ts             # Payments
│   └── notifications.ts          # Push setup
├── stores/
│   ├── authStore.ts              # User session
│   ├── profileStore.ts           # Profile data
│   └── activityStore.ts          # Activities cache
├── constants/
│   ├── colors.ts                 # Design tokens
│   ├── venues.ts                 # Venue list + icons
│   └── languages.ts              # Language list + flags
└── supabase/
    └── schema.sql                # Full DB schema
```

---

## Database Schema (Supabase)

```sql
-- Users / profiles
create table profiles (
  id uuid references auth.users primary key,
  first_name text not null,
  bio text,
  languages text[] default '{}',
  open_to text[] default '{}',       -- venue preferences
  vibe_tags text[] default '{}',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Hotels
create table hotels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  country text not null,
  address text,
  created_at timestamptz default now()
);

-- Activities
create table activities (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references profiles(id) on delete cascade,
  hotel_id uuid references hotels(id),
  venue text not null,               -- 'pool' | 'gym' | 'lounge' | 'breakfast' | 'spa' | 'dinner'
  date date not null,
  time_from time not null,
  time_to time not null,
  note text,
  max_spots int default 3,
  status text default 'active',      -- 'active' | 'cancelled' | 'completed'
  created_at timestamptz default now()
);

-- Join requests
create table join_requests (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id) on delete cascade,
  requester_id uuid references profiles(id) on delete cascade,
  status text default 'pending',     -- 'pending' | 'accepted' | 'declined'
  created_at timestamptz default now(),
  unique(activity_id, requester_id)
);

-- Conversations (one per accepted join request)
create table conversations (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id),
  participant_a uuid references profiles(id),
  participant_b uuid references profiles(id),
  created_at timestamptz default now()
);

-- Messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id),
  content text not null,
  created_at timestamptz default now()
);

-- Subscription / passes
create table passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null,               -- 'trip_14' | 'free_7' | 'referral_7'
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Referrals
create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references profiles(id),
  referred_id uuid references profiles(id),
  code text not null,
  rewarded boolean default false,
  created_at timestamptz default now(),
  unique(referred_id)
);

-- RLS: enable on all tables
alter table profiles enable row level security;
alter table activities enable row level security;
alter table join_requests enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table passes enable row level security;
alter table referrals enable row level security;
```

---

## Design Tokens

```typescript
// constants/colors.ts
export const colors = {
  bg: {
    primary:   '#0f0e0c',
    secondary: '#141210',
    tertiary:  '#1a1810',
    card:      '#141210',
  },
  border: {
    default:   '#2a2520',
    subtle:    '#1e1c18',
    gold:      '#c9b98a',
    active:    '#3a3020',
  },
  text: {
    primary:   '#f0ece4',
    secondary: '#e8d8a8',
    muted:     '#7a7060',
    faint:     '#5a5040',
    ghost:     '#3a3020',
  },
  accent: {
    gold:      '#c9b98a',
    goldDark:  '#0a0908',   // text on gold bg
    green:     '#6db87a',
    greenBg:   '#0d2018',
  },
  brand: 'INSUITE',
}
```

---

## Core Features & Business Rules

### Authentication
- Apple Sign-In only — no email/password
- On first sign-in → create profile → onboarding flow (4 steps)
- On subsequent sign-in → go straight to Discover

### Onboarding (4 steps, all required except Bio)
1. First name (required, max 20 chars)
2. Languages (multi-select, at least 1 required)
3. Activities open to (multi-select, at least 1 required)
4. Bio (optional, max 120 chars, can skip)

### Activity Creation (4 steps)
1. Select hotel (search by name or city)
2. Select venue (Pool, Gym, Executive Lounge, Breakfast, Spa, Dinner)
3. Date + time slot (from/until, half-hour increments, 6am–11pm) + optional note
4. Confirm & publish

**Paywall rule:** First activity creation is free for all users. Subsequent activity creation requires an active pass (Trip Pass 14-day $2.99 or Referral 7-day free pass).

### Discover Feed
- Shows activities in the same city as the user's most recent activity hotel
- Sorted by: soonest first
- Filter chips: All, Pool, Gym, Lounge, Breakfast, Spa, Dinner
- Each card shows: venue icon, venue name, date/time, host name + languages, note preview, spot dots

### Join Request Flow
1. Guest taps "Request to join" on activity detail
2. Host receives push notification
3. Host accepts or declines from notification or Messages tab
4. On accept: conversation is auto-created, both users can chat

### Messaging
- Conversation per accepted join request only
- No general DMs — messages are always activity-scoped
- Real-time via Supabase Realtime

### Pricing & Passes
- **Free:** Browse & join activities, message matched guests, first activity post free
- **Trip Pass:** $2.99 one-time, 14 days, unlimited posts, post before check-in, priority in Discover
- **Referral pass:** 7 days free, earned when referred user posts their first activity
- Paywall shown when user tries to post a second activity without active pass

### Referral System
- Each user has a unique referral code (e.g. JAMES7 = first name + random digit)
- Referral tracked when new user enters code during onboarding or in Redeem screen
- Reward triggered when referred user posts their first activity
- Reward = 7-day free pass credited to referrer automatically

---

## Key Screens Summary

| Screen | Route | Notes |
|---|---|---|
| Welcome | /welcome | Apple Sign-In button only |
| Onboarding Name | /onboarding/name | Step 1 of 4 |
| Onboarding Languages | /onboarding/languages | Step 2 of 4 |
| Onboarding Activities | /onboarding/activities | Step 3 of 4 |
| Onboarding Bio | /onboarding/bio | Step 4 of 4, skippable |
| Discover | /discover | Main feed, bottom tab |
| Activity Detail | /activities/[id] | Request to join CTA |
| My Activities | /activities | Bottom tab, + New button |
| New Activity — Hotel | /activities/new/hotel | Step 1 of 4 |
| New Activity — Venue | /activities/new/venue | Step 2 of 4 |
| New Activity — DateTime | /activities/new/datetime | Step 3 of 4 |
| New Activity — Confirm | /activities/new/confirm | Step 4 of 4 |
| Messages List | /messages | Bottom tab |
| Chat Thread | /messages/[id] | Activity-scoped |
| Profile | /profile | Bottom tab |
| Edit Profile | /profile/edit | Sub-screens per field |
| Plans & Pricing | /plans | Trip Pass + Referral |
| Referral | /plans/referral | Share code, track referrals |
| Redeem | /plans/redeem | Enter referral/free code |

---

## Development Priorities (MVP Order)

1. Project scaffold + Supabase setup + Apple Sign-In
2. Onboarding flow (4 steps)
3. Activity creation flow (4 steps)
4. Discover feed
5. Activity detail + join request
6. Messaging (Supabase Realtime)
7. Profile + edit
8. Paywall + RevenueCat
9. Referral system
10. Push notifications
11. Polish + App Store submission

---

## Commands to Run First

```bash
npx create-expo-app insuite --template blank-typescript
cd insuite
npx expo install expo-router expo-apple-authentication expo-notifications zustand @supabase/supabase-js
npm install react-native-purchases  # RevenueCat
```

---

## Notes for Claude Code

- Always use TypeScript (.tsx / .ts), never plain JS
- Use Expo Router file-based routing — no React Navigation setup needed
- All colors must come from constants/colors.ts — no hardcoded hex values in components
- Dark theme only — no light mode
- All API calls go through lib/supabase.ts — never call Supabase directly in components
- Keep components small and single-purpose
- When in doubt about a UI detail, refer to the design tokens above
