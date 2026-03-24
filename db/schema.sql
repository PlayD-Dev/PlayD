-- Delete all tables, reset the database
-- WARNING: WILL DELETE ALL DATA
drop table if exists public.ledger_entries cascade;
drop table if exists public.payments cascade;
drop table if exists public.requests cascade;
drop table if exists public.guest_sessions cascade;
drop table if exists public.events cascade;
drop table if exists public.tracks cascade;
drop table if exists public.dj_profiles cascade;

drop type if exists ledger_entry_type cascade;
drop type if exists request_status cascade;
drop type if exists event_status cascade;

create extension if not exists pgcrypto;

create type event_status as enum ('draft', 'live', 'ended');
create type request_status as enum (
  'pending',
  'seen',
  'played',
  'skipped',
  'saved',
  'cancelled'
);
create type ledger_entry_type as enum (
  'gross_charge',
  'platform_fee',
  'dj_payout'
);


create table public.dj_profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  dj_name text not null,
  stripe_account_id text,
  bio text,
  created_at timestamptz not null default now()
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  spotify_id text unique not null,
  title text not null,
  artist text not null,
  album text,
  bpm integer,
  key text,
  album_art_url text,
  metadata_status text,
  spotify_url text
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  dj_id uuid not null references public.dj_profiles(id) on delete cascade,
  name text not null,
  event_code text unique not null,
  status event_status not null default 'draft',
  free_requests_enabled boolean not null default true,
  paid_requests_enabled boolean not null default true,
  mic_notes_enabled boolean not null default false,
  started_at timestamptz,
  ended_at timestamptz
);

create table public.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  display_name text not null,
  device_token text,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  session_id uuid not null references public.guest_sessions(id) on delete cascade,
  track_id uuid not null references public.tracks(id),
  priority_score numeric,
  message text,
  submitted_at timestamptz not null default now(),
  resolved_at timestamptz,
  status request_status not null default 'pending'
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests(id) on delete cascade,
  gross_amount numeric(10,2) not null,
  platform_fee numeric(10,2) not null,
  dj_payout numeric(10,2) not null,
  stripe_payment_intent_id text unique
);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  type ledger_entry_type not null,
  amount numeric(10,2) not null,
  description text,
  created_at timestamptz not null default now()
);


create index idx_events_dj_id on public.events(dj_id);
create index idx_events_event_code on public.events(event_code);
create index idx_guest_sessions_event_id on public.guest_sessions(event_id);
create index idx_requests_event_id on public.requests(event_id);
create index idx_requests_session_id on public.requests(session_id);
create index idx_requests_track_id on public.requests(track_id);
create index idx_payments_request_id on public.payments(request_id);
create index idx_ledger_entries_payment_id on public.ledger_entries(payment_id);
create index idx_ledger_entries_event_id on public.ledger_entries(event_id);
create index idx_tracks_spotify_id on public.tracks(spotify_id);