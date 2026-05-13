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
│   ├── _layout.tsx               # Root Stack, auth gate, top-level routes
│   ├── welcome.tsx
│   ├── onboarding/               # name → languages → activities → bio
│   ├── (app)/                    # Tabs group (auth-required)
│   │   ├── _layout.tsx           # Tab navigator: discover / activities / messages / profile
│   │   ├── discover.tsx
│   │   ├── activities/           # list + new/ wizard + [id] detail
│   │   ├── messages/             # list + [id] chat
│   │   └── profile/              # view + edit/* + blocked
│   ├── admin/                    # Admin-only — see Admin Tooling
│   │   ├── _layout.tsx           # Stack
│   │   ├── index.tsx             # Landing
│   │   ├── hotels/               # list / new / [id] edit+delete
│   │   ├── requests.tsx          # hotel_requests queue
│   │   └── reports.tsx           # reports moderation queue
│   ├── activity/[id].tsx         # Public activity detail (outside tabs)
│   ├── user/[id].tsx
│   ├── plans/                    # paywall / referral / redeem
│   ├── legal/                    # privacy / terms
│   └── redeem/[code].tsx
├── components/
│   ├── ui/                       # Avatar, Button, Card, ...
│   ├── activity/                 # ActivityCard, ActivityDetail
│   ├── messaging/                # ChatBubble, MessageInput
│   └── admin/                    # AdminGate (client-side gate; RLS is the real wall)
├── lib/
│   ├── supabase.ts               # Client + hand-rolled Database type
│   ├── auth.ts                   # Apple sign-in
│   ├── activitiesApi.ts          # Hotels / activities / join requests
│   ├── adminApi.ts               # Admin CRUD + queues (Supabase-coupled)
│   ├── adminApi.helpers.ts       # Pure helpers — tested in __tests__/
│   ├── moderationApi.ts          # Blocks + reports (user-side)
│   ├── messagesApi.ts            # Conversations + messages
│   ├── profileApi.ts             # Profile + avatar
│   ├── passesApi.ts              # Trip pass / referral pass
│   ├── referralsApi.ts           # Referral codes
│   ├── accountApi.ts             # Delete account
│   ├── notifications.ts          # Push setup
│   ├── iap.ts                    # RevenueCat / expo-iap
│   └── avatarPicker.ts
├── stores/                       # Zustand stores: auth, profile, activityDraft, ...
├── constants/                    # colors, venues, languages, hotels (demo fallback), ...
├── supabase/                     # Migrations + verification scripts (manual apply)
│   ├── schema.sql                # Base schema (profiles, hotels, activities, ...)
│   ├── hotel_requests.sql        # User-submitted hotel suggestions
│   ├── blocks_and_reports.sql    # Apple 1.2 abuse handling
│   ├── admin_role.sql            # profile.is_admin + hotels/hotel_requests admin RLS
│   ├── admin_reports.sql         # reports admin RLS
│   ├── admin_role_verify.sql     # RLS smoke test (7 invariants)
│   ├── admin_reports_verify.sql  # RLS smoke test (4 invariants)
│   ├── seed.sql                  # 12-hotel base catalog
│   ├── hotels_expansion.sql      # Luxury indies (~100)
│   ├── hotels_chains.sql         # Chain luxury+upscale (~250)
│   ├── hotels_grand_hyatt_plus.sql  # Grand Hyatt-tier-and-above (~96)
│   ├── hotels_new_cities_apac.sql   # Beijing/Macau/KL/Osaka/Hanoi/HCMC/Mumbai (~47)
│   └── functions/                # Edge functions (e.g. send-push)
├── __tests__/                    # vitest
└── vitest.config.ts
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
  is_admin boolean not null default false,  -- unlocks /admin; see Admin Tooling
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

Additional tables in separate migration files:
- `hotel_requests` (supabase/hotel_requests.sql) — user-submitted "add this hotel" suggestions
- `blocks` / `reports` (supabase/blocks_and_reports.sql) — Apple 1.2 compliance
- Admin RLS policies (supabase/admin_role.sql, supabase/admin_reports.sql) — read more in Admin Tooling

Catalog seeding lives in `supabase/seed.sql` + four expansion files (`hotels_expansion.sql`, `hotels_chains.sql`, `hotels_grand_hyatt_plus.sql`, `hotels_new_cities_apac.sql`). All idempotent — re-run safely; ~547 properties across 33 cities once fully applied.

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

## Admin Tooling

Lives at `/admin/*` — top-level routes (not inside the `(app)/` tabs group) reached via Profile → "Admin" row. The row only renders when `profile.is_admin = true`, and `AdminGate` (in `components/admin/`) bounces non-admins back to `/profile` if they deep-link.

**Bootstrap** (one-time, per admin user):
1. Apply `supabase/admin_role.sql` + `supabase/admin_reports.sql` in the Supabase Dashboard SQL editor.
2. Promote yourself once:
   ```sql
   update profiles set is_admin = true where id = '<your-user-id>';
   ```
   (User id is under Authentication → Users in the Dashboard.)
3. Reload the app — the "Admin" row appears in Profile.

**Sub-screens**:
- `/admin` — landing with live counts for hotels / pending requests / pending reports.
- `/admin/hotels` — list + search + city chip filter + sort toggle (A–Z / Newest) + Add / Edit / Delete. Delete is blocked while activities reference the hotel (FK count shown on the edit screen).
- `/admin/requests` — `hotel_requests` queue. Pending / Approved / Rejected tabs. Approve opens a modal pre-filled with the submitter's input so typos can be cleaned before insert.
- `/admin/reports` — `reports` moderation queue (Apple 1.2). Pending / Actioned / Dismissed tabs. Target labels deep-link to `/user/[id]` / `/activity/[id]` / `/messages/[id]` for context. The actual remediation (block / cancel / delete) happens on those destination screens; the status flip here is the audit trail.

**RLS** (the real enforcement — the UI gate is just UX):
- `supabase/admin_role.sql` — `hotels` admin-only insert/update/delete + `hotel_requests` admin select/update.
- `supabase/admin_reports.sql` — `reports` admin select/update. No delete policy by design; reports are forever-audit.
- `profiles.is_admin` is service-role-only writable. A column-level revoke alone is a no-op when Supabase grants `authenticated` table-wide UPDATE (the revoke gets shadowed); the actual wall is a `BEFORE UPDATE OF is_admin` trigger that rejects any change unless `current_user` is `postgres` / `service_role`. Found by the verify script — see Notes for Claude Code.

**RLS verification scripts** (run against the live DB after applying migrations):
- `supabase/admin_role_verify.sql` — 7 invariants on hotels + hotel_requests + the is_admin lock.
- `supabase/admin_reports_verify.sql` — 4 invariants on the reports queue.
- Both use `set local role authenticated` + a synthetic non-admin uid. Each writes one PASS/FAIL row into a temp table and returns it in the Results panel (the older RAISE NOTICE pattern is invisible on the current Dashboard — temp table is the workaround).

---

## Testing

```bash
npm test              # one-shot run
npm run test:watch    # interactive
```

Vitest, no jest. Pure-TS only — current scope is `lib/adminApi.helpers.ts` (normalize, validate, format, build report target). Tests live in `__tests__/`.

When adding tests for Supabase-touching code, keep the network-bound parts in the wrapper (`lib/*Api.ts`) and the pure logic in a sibling `*.helpers.ts` file. Tests target the helpers, not the wrapper — avoids mocking the Supabase client.

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
| Admin landing | /admin | Gated by `profile.is_admin` |
| Admin Hotels | /admin/hotels | Search + sort + city chips + Add/Edit/Delete |
| Admin Hotel — New / Edit | /admin/hotels/new · /admin/hotels/[id] | Edit shows FK-count guard before Delete |
| Admin Requests | /admin/requests | `hotel_requests` queue with Pending/Approved/Rejected tabs |
| Admin Reports | /admin/reports | `reports` queue with Pending/Actioned/Dismissed tabs |

---

## Development Priorities (MVP Order)

All 1–10 are shipped. Item 11 is in progress (App Store reviewer audit landed; admin tooling + RLS smoke tests added to satisfy Guideline 1.2 abuse handling).

1. ✅ Project scaffold + Supabase setup + Apple Sign-In
2. ✅ Onboarding flow (4 steps)
3. ✅ Activity creation flow (4 steps)
4. ✅ Discover feed
5. ✅ Activity detail + join request
6. ✅ Messaging (Supabase Realtime)
7. ✅ Profile + edit
8. ✅ Paywall + RevenueCat
9. ✅ Referral system
10. ✅ Push notifications
11. 🔵 Polish + App Store submission (in progress)

---

## Commands

```bash
npm install              # first time / after pulling new deps
npm start                # Metro / Expo dev server
npm test                 # run vitest once
npm run test:watch       # vitest interactive
npm run lint             # expo lint
```

Type check: `npx tsc --noEmit -p tsconfig.json`

Worktree setup (when spinning up a new worktree off main): copy `.env` from the main repo into the worktree, junction `node_modules` (`mklink /J <worktree>/node_modules <main-repo>/node_modules`), then `npm start --clear` on a free port. See user memory `worktree_setup.md`.

Admin bootstrap (one-time per admin user): apply `supabase/admin_role.sql` + `supabase/admin_reports.sql`, then `update profiles set is_admin = true where id = '<your-id>'` in the Dashboard.

---

## Notes for Claude Code

- Always use TypeScript (.tsx / .ts), never plain JS
- Use Expo Router file-based routing — no React Navigation setup needed
- All colors must come from constants/colors.ts — no hardcoded hex values in components
- Dark theme only — no light mode
- All API calls go through lib/supabase.ts — never call Supabase directly in components
- Keep components small and single-purpose
- When in doubt about a UI detail, refer to the design tokens above
- New top-level routes outside the `(app)/` tabs group need a matching `Stack.Screen` in `app/_layout.tsx` and **must not** be registered as a tab in `app/(app)/_layout.tsx` (Expo Router auto-discovers them as hidden tabs otherwise). `/admin` is the reference example.
- Pure helpers extracted from Supabase-coupled wrappers (e.g. `lib/adminApi.helpers.ts`) live alongside the wrapper. Tests target the helpers — wrappers stay un-tested by design unless you mock the client.

### Gotchas worth remembering

- **Postgres column-level revoke doesn't override table-level grant.** `revoke update (col) on T from authenticated` is a no-op while `authenticated` still has a table-wide UPDATE (which Supabase grants by default). The real wall is a `BEFORE UPDATE OF col` trigger. The `profiles.is_admin` lockdown in `supabase/admin_role.sql` uses this pattern; the verification suite caught the bug.
- **Supabase Dashboard RAISE NOTICE messages aren't visible on the current UI.** Verification scripts use a temp table + final SELECT so results land in the Results panel.
- **`supabase/*.sql` files aren't auto-applied** — they have to be pasted into the Dashboard SQL editor. Always idempotent (`where not exists` / `drop policy if exists`). Re-runnable. Check `pg_policies` against the file before assuming a code bug.
