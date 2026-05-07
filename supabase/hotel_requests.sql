-- =====================================================
-- hotel_requests — user-submitted "add this hotel" suggestions.
-- Workflow:
--   1. User searches in app/(app)/activities/new/hotel.tsx, doesn't find
--      their hotel, taps "Request to add" with prefilled name from search.
--   2. App inserts a row here. RLS lets users insert their own and read their
--      own; nobody else can read.
--   3. Owner reviews periodically in Supabase Dashboard, manually copies the
--      good ones into the `hotels` table, sets status = 'approved' (or
--      'rejected' for spam / non-luxury).
-- =====================================================

create table if not exists hotel_requests (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references profiles(id) on delete cascade,
  name          text not null check (char_length(name) between 2 and 120),
  city          text not null check (char_length(city) between 2 and 80),
  country       text not null check (char_length(country) between 2 and 80),
  notes         text check (notes is null or char_length(notes) <= 500),
  status        text not null default 'pending'
                 check (status in ('pending','approved','rejected')),
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz
);

create index if not exists hotel_requests_status_idx
  on hotel_requests (status, created_at);
create index if not exists hotel_requests_requester_idx
  on hotel_requests (requester_id, created_at desc);

alter table hotel_requests enable row level security;

-- Caller can submit requests as themselves only.
drop policy if exists "hotel_requests insert as self" on hotel_requests;
create policy "hotel_requests insert as self"
  on hotel_requests for insert to authenticated
  with check (auth.uid() = requester_id);

-- Caller can read their own submissions (handy for "your pending requests"
-- screen later). Owner / moderator access goes through service-role key
-- in the Supabase dashboard.
drop policy if exists "hotel_requests read own" on hotel_requests;
create policy "hotel_requests read own"
  on hotel_requests for select to authenticated
  using (auth.uid() = requester_id);
