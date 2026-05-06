-- InSuite — Full Database Schema
-- Run this in the Supabase SQL editor on a fresh project.

-- =====================================================
-- Extensions
-- =====================================================
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- =====================================================
-- Tables
-- =====================================================

-- Profiles
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text not null check (char_length(first_name) <= 20),
  bio text check (bio is null or char_length(bio) <= 120),
  languages text[] not null default '{}',
  open_to text[] not null default '{}',
  vibe_tags text[] not null default '{}',
  avatar_url text,
  referral_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Hotels
create table if not exists hotels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null,
  country text not null,
  address text,
  created_at timestamptz not null default now()
);
create index if not exists hotels_city_idx on hotels (city);
create index if not exists hotels_name_trgm_idx on hotels using gin (name gin_trgm_ops);

-- Activities
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references profiles(id) on delete cascade,
  hotel_id uuid not null references hotels(id),
  venue text not null check (venue in ('pool','gym','lounge','breakfast','spa','dinner')),
  date date not null,
  time_from time not null,
  time_to time not null,
  note text check (note is null or char_length(note) <= 200),
  max_spots int not null default 3 check (max_spots between 1 and 5),
  status text not null default 'active' check (status in ('active','cancelled','completed')),
  created_at timestamptz not null default now(),
  check (time_to > time_from)
);
create index if not exists activities_host_idx on activities (host_id);
create index if not exists activities_hotel_idx on activities (hotel_id);
create index if not exists activities_date_idx on activities (date, time_from);

-- Join requests
create table if not exists join_requests (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  requester_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  unique(activity_id, requester_id)
);
create index if not exists join_requests_activity_idx on join_requests (activity_id);
create index if not exists join_requests_requester_idx on join_requests (requester_id);

-- Conversations
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  participant_a uuid not null references profiles(id) on delete cascade,
  participant_b uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(activity_id, participant_a, participant_b)
);
create index if not exists conversations_participants_idx
  on conversations (participant_a, participant_b);

-- Messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx
  on messages (conversation_id, created_at);

-- Passes
create table if not exists passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('trip_14','free_7','referral_7')),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at > starts_at)
);
create index if not exists passes_user_idx on passes (user_id, expires_at);

-- Referrals
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles(id) on delete cascade,
  referred_id uuid not null references profiles(id) on delete cascade,
  code text not null,
  rewarded boolean not null default false,
  created_at timestamptz not null default now(),
  unique(referred_id)
);
create index if not exists referrals_referrer_idx on referrals (referrer_id);

-- =====================================================
-- Row Level Security
-- =====================================================
alter table profiles enable row level security;
alter table hotels enable row level security;
alter table activities enable row level security;
alter table join_requests enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table passes enable row level security;
alter table referrals enable row level security;

-- Profiles
create policy "profiles readable by authenticated"
  on profiles for select to authenticated using (true);

create policy "profiles insert own"
  on profiles for insert to authenticated with check (auth.uid() = id);

create policy "profiles update own"
  on profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Hotels (read-only catalog)
create policy "hotels readable by authenticated"
  on hotels for select to authenticated using (true);

-- Activities
create policy "activities readable by authenticated"
  on activities for select to authenticated using (true);

create policy "activities insert as host"
  on activities for insert to authenticated with check (auth.uid() = host_id);

create policy "activities update own"
  on activities for update to authenticated using (auth.uid() = host_id) with check (auth.uid() = host_id);

create policy "activities delete own"
  on activities for delete to authenticated using (auth.uid() = host_id);

-- Join requests
create policy "join_requests visible to host or requester"
  on join_requests for select to authenticated using (
    auth.uid() = requester_id
    or auth.uid() in (select host_id from activities where id = activity_id)
  );

create policy "join_requests insert as requester"
  on join_requests for insert to authenticated with check (
    auth.uid() = requester_id
    and auth.uid() <> (select host_id from activities where id = activity_id)
  );

create policy "join_requests host updates status"
  on join_requests for update to authenticated using (
    auth.uid() in (select host_id from activities where id = activity_id)
  );

-- Conversations
create policy "conversations visible to participants"
  on conversations for select to authenticated using (
    auth.uid() = participant_a or auth.uid() = participant_b
  );

create policy "conversations insert by participant"
  on conversations for insert to authenticated with check (
    auth.uid() = participant_a or auth.uid() = participant_b
  );

-- Messages
create policy "messages visible to conversation participants"
  on messages for select to authenticated using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

create policy "messages insert as sender in own conversation"
  on messages for insert to authenticated with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

-- Passes
create policy "passes readable by owner"
  on passes for select to authenticated using (auth.uid() = user_id);

-- Referrals
create policy "referrals readable by participants"
  on referrals for select to authenticated using (
    auth.uid() = referrer_id or auth.uid() = referred_id
  );

-- =====================================================
-- Triggers
-- =====================================================

-- Keep profiles.updated_at fresh
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Auto-create conversation on accepted join request
create or replace function create_conversation_on_accept()
returns trigger language plpgsql as $$
declare v_host uuid;
begin
  if new.status = 'accepted' and (old.status is distinct from 'accepted') then
    select host_id into v_host from activities where id = new.activity_id;
    insert into conversations (activity_id, participant_a, participant_b)
    values (new.activity_id, v_host, new.requester_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists join_requests_create_conversation on join_requests;
create trigger join_requests_create_conversation
  after update on join_requests
  for each row execute function create_conversation_on_accept();

-- =====================================================
-- Realtime
-- =====================================================
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table join_requests;
alter publication supabase_realtime add table conversations;

-- =====================================================
-- Avatar storage bucket
-- =====================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar upload by owner"
  on storage.objects for insert to authenticated with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatar update by owner"
  on storage.objects for update to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatar delete by owner"
  on storage.objects for delete to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars readable by anyone"
  on storage.objects for select to public using (bucket_id = 'avatars');
