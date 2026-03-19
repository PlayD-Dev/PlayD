# Supabase Setup Guide

This guide walks through setting up the PlayD database and authentication from scratch using Supabase.

---

## Prerequisites

- A [Supabase](https://supabase.com) account
- Node.js 18+ installed
- The PlayD frontend repo cloned locally

---

## Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Fill in:
   - **Name**: `playd` (or `playd-dev` for your dev environment)
   - **Database password**: Generate a strong password and save it somewhere safe.
   - **Region**: Pick the region closest to your users.
4. Click **Create new project** and wait ~2 minutes for provisioning.

---

## Step 2 — Configure DJ Authentication

PlayD uses Supabase Auth for DJ accounts only. Guests are anonymous sessions scoped to an event.

### Enable Email Auth

1. In your Supabase dashboard, go to **Authentication → Providers**.
2. Ensure **Email** is enabled (it is by default).
3. Under **Authentication → Settings**:
   - Set **Site URL** to your frontend URL (e.g. `http://localhost:3000` for dev, your Vercel URL for prod).
   - Add `http://localhost:3000/auth/callback` to **Redirect URLs**.

> **Note:** DJ sign-up should be invite-only or admin-controlled so random people cannot create DJ accounts. To enforce this, go to **Authentication → Settings** and disable **"Enable email confirmations"** during dev (re-enable for prod), and handle sign-up only from a protected admin route in your app.

---

## Step 3 — Run the Database Schema

Go to **SQL Editor** in your Supabase dashboard and run the following blocks in order.

### 3a — Enable Extensions

```sql
-- UUID generation (enabled by default in Supabase, but just in case)
create extension if not exists "pgcrypto";
```

### 3b — Create Custom Types

```sql
create type request_status as enum ('pending', 'seen', 'played', 'skipped');
create type event_status   as enum ('active', 'paused', 'ended');
create type payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');
create type ledger_type    as enum ('gross_charge', 'platform_fee', 'dj_payout');
```

### 3c — DJs Table

This extends Supabase Auth. Every DJ must have an account in `auth.users` first.

```sql
create table djs (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text        not null,
  stripe_account_id text,          -- Stripe Connect account ID for payouts (nullable until onboarded)
  created_at     timestamptz not null default now()
);

comment on table djs is 'DJ profiles, one per Supabase Auth user.';
comment on column djs.stripe_account_id is 'Stripe Connect Express account ID. Null until the DJ completes Stripe onboarding.';
```

### 3d — Events Table

```sql
create table events (
  id          uuid primary key default gen_random_uuid(),
  dj_id       uuid        not null references djs(id) on delete cascade,
  name        text        not null,
  venue       text,
  status      event_status not null default 'active',
  join_code   text        not null unique,   -- short code guests type in (e.g. "FUNK42")
  boost_price_cents int  not null default 200, -- default $2.00 boost price; DJ can customise
  created_at  timestamptz not null default now(),
  ended_at    timestamptz
);

comment on column events.join_code      is 'Short alphanumeric code displayed on the DJ screen. Guests enter this to join.';
comment on column events.boost_price_cents is 'Price in cents that guests pay to boost a request. Configurable per event.';
```

### 3e — Guest Sessions Table

Guest sessions are anonymous — no Supabase Auth account required.

```sql
create table guest_sessions (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid        not null references events(id) on delete cascade,
  display_name   text        not null,        -- name guest enters when joining (e.g. "Alex")
  created_at     timestamptz not null default now(),
  last_seen_at   timestamptz not null default now()
);

comment on table guest_sessions is 'Anonymous guest sessions. One row per guest per event.';
comment on column guest_sessions.last_seen_at is 'Updated on each request or action; useful for detecting idle guests.';
```

### 3f — Tracks Table

Shared song catalog. One row per unique track — not duplicated across requests.

```sql
create table tracks (
  id            uuid primary key default gen_random_uuid(),
  itunes_id     bigint unique,          -- iTunes track ID for deduplication
  title         text not null,
  artist        text not null,
  album         text,
  artwork_url   text,
  preview_url   text,                   -- 30-sec iTunes preview
  duration_ms   int,
  bpm           numeric(5, 2),         -- from GetSongBPM API
  musical_key   text,                   -- e.g. "C Major", "F# Minor"
  time_signature text,                  -- e.g. "4/4"
  created_at    timestamptz not null default now()
);

comment on table tracks is 'Deduplicated song catalog populated from iTunes Search + GetSongBPM APIs.';
comment on column tracks.itunes_id is 'Used to avoid inserting duplicate tracks. Always look up by this before inserting.';
```

### 3g — Requests Table

Core table — one row per song request a guest submits.

```sql
create table requests (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid        not null references events(id) on delete cascade,
  guest_session_id uuid        not null references guest_sessions(id) on delete cascade,
  track_id         uuid        not null references tracks(id),
  status           request_status not null default 'pending',
  is_boosted       boolean     not null default false,
  priority         int         not null default 0, -- higher = shown earlier in DJ queue
  message          text,                           -- optional note from guest to DJ
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column requests.is_boosted is 'Set to true once the linked payment succeeds. Do not set manually.';
comment on column requests.priority   is 'Boosted requests get a higher value. DJ queue orders by priority DESC, created_at ASC.';
```

### 3h — Payments Table

One optional payment row per request. No payment row = free request.

```sql
create table payments (
  id                   uuid primary key default gen_random_uuid(),
  request_id           uuid        not null unique references requests(id) on delete cascade,
  guest_session_id     uuid        not null references guest_sessions(id),
  dj_id                uuid        not null references djs(id),
  stripe_payment_intent_id text    not null unique,
  amount_cents         int         not null,  -- total charged to guest
  platform_fee_cents   int         not null,  -- PlayD's cut
  dj_payout_cents      int         not null,  -- amount sent to DJ via Stripe Connect
  status               payment_status not null default 'pending',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table payments is 'One row per boosted request. Free requests have no payment row.';
comment on column payments.stripe_payment_intent_id is 'Set when PaymentIntent is created. Used to match Stripe webhook events.';
```

### 3i — Ledger Entries Table

Append-only financial audit log. Three rows are inserted per payment (gross, fee, payout).

```sql
create table ledger_entries (
  id           uuid primary key default gen_random_uuid(),
  payment_id   uuid        not null references payments(id),
  event_id     uuid        not null references events(id),  -- denormalised for fast per-event queries
  dj_id        uuid        not null references djs(id),
  type         ledger_type not null,
  amount_cents int         not null,  -- positive = money in, negative = money out
  note         text,
  created_at   timestamptz not null default now()
);

comment on table ledger_entries is 'Append-only financial log. Never update or delete rows here.';
comment on column ledger_entries.event_id is 'Denormalised from payment→request→event to allow single-query per-event financial summaries.';
comment on column ledger_entries.amount_cents is 'Negative for outflows (dj_payout, platform_fee recorded as a reduction), positive for inflows.';
```

### 3j — Indexes

```sql
-- DJ queue: fetch all pending requests for an event, newest boosts first
create index idx_requests_event_queue
  on requests(event_id, priority desc, created_at asc)
  where status = 'pending';

-- Guest: look up all requests by a guest session
create index idx_requests_guest_session
  on requests(guest_session_id);

-- Events: look up all events for a DJ
create index idx_events_dj
  on events(dj_id);

-- Payments: look up by Stripe webhook
create index idx_payments_stripe_intent
  on payments(stripe_payment_intent_id);

-- Ledger: per-event financial summary
create index idx_ledger_event
  on ledger_entries(event_id);

-- Guest session lookup by event + join code flow
create index idx_guest_sessions_event
  on guest_sessions(event_id);

-- Track deduplication lookup
create index idx_tracks_itunes_id
  on tracks(itunes_id);
```

### 3k — Auto-update `updated_at`

```sql
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_requests_updated_at
  before update on requests
  for each row execute function set_updated_at();

create trigger trg_payments_updated_at
  before update on payments
  for each row execute function set_updated_at();
```

---

## Step 4 — Row Level Security (RLS)

RLS ensures users can only access data they are allowed to see. Run these in the SQL Editor.

```sql
-- Enable RLS on every table
alter table djs              enable row level security;
alter table events           enable row level security;
alter table guest_sessions   enable row level security;
alter table tracks           enable row level security;
alter table requests         enable row level security;
alter table payments         enable row level security;
alter table ledger_entries   enable row level security;
```

### DJs

```sql
-- DJs can read and update only their own profile
create policy "djs: read own" on djs
  for select using (auth.uid() = id);

create policy "djs: update own" on djs
  for update using (auth.uid() = id);

-- Supabase creates the auth.users row on sign-up; we insert the djs row from the app
create policy "djs: insert own" on djs
  for insert with check (auth.uid() = id);
```

### Events

```sql
-- DJs can manage their own events
create policy "events: dj full access" on events
  for all using (auth.uid() = dj_id);

-- Guests can read an event by join_code (needed before they have a session)
-- This is handled via a public RPC function (see Step 5) — no direct select needed
```

### Tracks

```sql
-- Tracks are a public read-only catalog; only the backend (service role) writes to it
create policy "tracks: public read" on tracks
  for select using (true);
```

### Guest Sessions

```sql
-- Guests identify via their session ID stored client-side (not Supabase Auth)
-- The backend (service role key) manages guest session rows
-- DJs can read all guest sessions for their events
create policy "guest_sessions: dj read" on guest_sessions
  for select using (
    exists (
      select 1 from events
      where events.id = guest_sessions.event_id
        and events.dj_id = auth.uid()
    )
  );
```

### Requests

```sql
-- DJs can read and update (status changes) all requests in their events
create policy "requests: dj full access" on requests
  for all using (
    exists (
      select 1 from events
      where events.id = requests.event_id
        and events.dj_id = auth.uid()
    )
  );
```

### Payments & Ledger

```sql
-- Only authenticated DJs can read payments/ledger for their events
create policy "payments: dj read" on payments
  for select using (dj_id = auth.uid());

create policy "ledger_entries: dj read" on ledger_entries
  for select using (dj_id = auth.uid());
```

> **Important:** Guest-facing writes (submitting requests, creating guest sessions, recording payments) must go through your **backend API using the Supabase service role key**, never the anon key directly from the browser. This keeps your RLS simple and your data safe.

---

## Step 5 — Create a Guest Join RPC Function

Guests join an event by entering a code. This function validates the code and returns the event — callable from the frontend with the anon key.

```sql
create or replace function join_event(p_join_code text)
returns table (
  event_id   uuid,
  event_name text,
  dj_name    text,
  status     event_status
)
language plpgsql security definer as $$
begin
  return query
  select
    e.id,
    e.name,
    d.display_name,
    e.status
  from events e
  join djs d on d.id = e.dj_id
  where upper(e.join_code) = upper(p_join_code)
    and e.status != 'ended';
end;
$$;
```

---

## Step 6 — Get Your API Keys

1. In Supabase, go to **Project Settings → API**.
2. Copy the following values:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (never expose to browser) |

3. Create a `.env.local` file in your `frontend/` directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# GetSongBPM (for BPM + key enrichment)
GETSONGBPM_API_KEY=your-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

> Never commit `.env.local`. It is already in `.gitignore`.

---

## Step 7 — Install the Supabase Client

In your `frontend/` directory:

```bash
npm install @supabase/supabase-js
```

Create `frontend/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Use this client in browser/React components
export const supabase = createClient(supabaseUrl, supabaseAnon)
```

And `frontend/src/lib/supabase-server.ts` (for API routes / server actions only):

```typescript
import { createClient } from '@supabase/supabase-js'

// WARNING: never import this file in client components
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

---

## Step 8 — Test Your Setup

Run these queries in the Supabase SQL Editor to verify everything is wired up correctly.

```sql
-- Should return the names of all tables you just created
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

-- Should return all 4 enum types
select typname from pg_type
where typtype = 'e'
order by typname;

-- Should return all indexes
select indexname from pg_indexes
where schemaname = 'public'
order by indexname;
```

---

## Data Model Reference

```
djs ──────────────────────────────────────────────┐
 │ 1                                               │
 │ M                                               │
events ──────────────────────────┐                 │
 │ 1              │ 1            │ M               │ M
 │ M              │ M            │                 │
requests      guest_sessions    ledger_entries   payments
 │ 1              │ 1                              │
 │ M              │ M                              │
 └────────────────┘                                │
 │ M                                               │
 │ 0..1 ──────────────────────────────── payments ─┘
 │
tracks (M requests reference 1 track)
```

### Key design decisions

- **Tracks are deduplicated** — always `upsert` on `itunes_id` before inserting a request, so the same song is never stored twice.
- **Payments are optional** — no payment row = free request. `is_boosted` on `requests` is set to `true` by the Stripe webhook handler, not by the frontend.
- **`priority` on requests** — boosted requests get a higher priority value (e.g. `1`), free requests stay at `0`. The DJ queue always orders by `priority DESC, created_at ASC`.
- **Ledger is append-only** — never `update` or `delete` ledger rows. If a refund happens, insert a new `refunded` row.
- **`event_id` on ledger** — denormalised on purpose for fast per-event financial summaries without multi-table joins.
- **Service role key for guest writes** — guest sessions and requests are written from your backend API routes using the service role key, not the anon key, to keep RLS policies simple.
