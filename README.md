# PlayD — Crowd-Powered DJ Requests

PlayD is a two-sided web application that lets partygoers request songs for a DJ through a clean search interface, with optional paid priority boosting. DJs get a real-time dashboard to triage and act on requests without leaving the booth.

## The Problem

At live events, song requests are chaotic — people yell across the room, text the DJ, or interrupt the booth. Requests rarely include the information DJs actually need: an exact track match, BPM/key for mixing, and social context. DJs have no structured way to triage requests by priority while maintaining fairness and control of the set.

## The Solution

PlayD turns requests into a ranked, metadata-rich queue with optional paid prioritization. Guests get a clean search interface backed by the iTunes catalog. DJs get a real-time dashboard to filter, sort, and act on requests — all updated live via Supabase Realtime with no refresh needed.

## Authors

Yaw Owusu Jr, Emily Vu, Veljko Cvetkovic, Rumi Khamidov, Raunak Chitre, Rachana Chengari, Malachai Onwona

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL via Supabase |
| Realtime | Supabase Realtime (Phoenix Channels) |
| Music Search | iTunes Search API |
| Track Metadata | GetSongBPM API |
| QR Codes | `qrcode` npm package |
| Payments | Stripe *(not yet wired)* |
| Auth | Supabase Auth *(not yet wired)* |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with the schema applied (see [Database Schema](#database-schema))
- A GetSongBPM API key (for BPM/key lookups)

### 1. Clone and install

```bash
git clone https://github.com/PlayD-Dev/PlayD.git
cd PlayD/frontend
npm install
```

### 2. Configure environment variables

Create `frontend/.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Project Settings → API>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from Project Settings → API>

# GetSongBPM (BPM/key metadata)
GETSONGBPM_API_KEY=<your key from getsongbpm.com>

# App URL (used for QR code generation)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Enable Supabase Realtime

In the Supabase dashboard: **Database → Replication** → enable the `requests` table. This allows the DJ dashboard to receive live updates.

### 4. Seed test data

Insert a DJ profile and a test event so you have something to work with:

```sql
INSERT INTO dj_profiles (id, email, dj_name)
VALUES ('d1000000-0000-0000-0000-000000000001', 'dj@playd.test', 'DJ PlayD');

INSERT INTO events (id, dj_id, name, event_code, status)
VALUES (
  'e1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  'Saturday Night Live Set',
  'FUNK42',
  'live'
);
```

### 5. Run the dev server

```bash
cd frontend
npm run dev
```

Open:
- **Guest page**: `http://localhost:3000/request/e1000000-0000-0000-0000-000000000001`
- **DJ dashboard**: `http://localhost:3000/dashboard`

---

## Project Structure

```
PlayD/
├── frontend/               # Next.js application (main UI)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/        # API routes
│   │   │   ├── dashboard/  # DJ dashboard page
│   │   │   ├── request/    # Guest request page
│   │   │   └── auth/       # Login / signup (not yet wired)
│   │   ├── components/
│   │   │   ├── dashboard/  # Dashboard UI components
│   │   │   └── request/    # Guest request UI components
│   │   ├── hooks/          # React hooks (useDebounce, etc.)
│   │   └── lib/            # Supabase clients, API helpers, types
├── backend/                # NestJS backend (not yet used by frontend)
├── db/                     # schema.sql
└── docs/                   # API specs and setup guides
```

---

## How It Works

### Guest Flow

1. Guest opens `/request/[eventId]`
2. The page fetches the event name from Supabase and renders the search UI
3. On mount, `POST /api/sessions` creates an anonymous guest session tied to the event
4. Guest types a song name — debounced search hits `GET /api/search` (iTunes proxy)
5. Guest taps a result — `GET /api/track-meta` fetches BPM, key, and time signature
6. Guest selects a boost amount (Free / $2 / $5 / $10), adds an optional message, and submits
7. `POST /api/requests` upserts the track and inserts the request row in Supabase
8. Supabase Realtime broadcasts the INSERT to the DJ dashboard in real-time

### DJ Dashboard Flow

1. DJ opens `/dashboard`
2. Dashboard fetches all `pending` requests for the event (joined with track and session data)
3. A Supabase Realtime channel subscribes to `INSERT` and `UPDATE` events on `requests`
4. New requests appear at the top of the queue with a FLIP animation
5. DJ filters by All / Paid / Free and sorts by Priority / Time / BPM
6. DJ clicks an action (Seen / Save / Play / Skip) → optimistic UI removes the card, `PATCH /api/requests/[id]` updates the status in Supabase

---

## API Reference

### `POST /api/sessions`

Creates an anonymous guest session for an event.

**Body:**
```json
{ "eventId": "uuid", "displayName": "Guest Name" }
```

**Response:**
```json
{
  "sessionId": "uuid",
  "eventId": "uuid",
  "eventName": "Saturday Night Live Set",
  "djName": "DJ PlayD"
}
```

**Errors:** `404` if event not found or ended.

---

### `POST /api/requests`

Submits a song request. Upserts the track first, then inserts the request.

**Body:**
```json
{
  "eventId": "uuid",
  "sessionId": "uuid",
  "track": { "trackId": 1234, "trackName": "Blinding Lights", "artistName": "The Weeknd", ... },
  "message": "Please play this one next!",
  "boostAmount": 5
}
```

**Response:** `201` with the created request row (joined with track data).

**Notes:**
- `boostAmount` maps directly to `priority_score` in the database (0 = free)
- Tracks are deduplicated by iTunes `trackId` (stored in the `spotify_id` column)

---

### `PATCH /api/requests/[id]`

Updates the status of a request. Called by the DJ dashboard.

**Body:**
```json
{ "status": "seen" | "saved" | "played" | "skipped" | "cancelled" }
```

**Response:**
```json
{ "request": { "id": "uuid", "status": "played" } }
```

**Notes:** Terminal statuses (`played`, `skipped`, `cancelled`) also set `resolved_at`.

---

### `GET /api/search?q=blinding+lights&limit=10`

Proxies the iTunes Search API. Max `limit` is 25.

**Response:**
```json
{ "tracks": [ { "trackId": 1234, "trackName": "...", "artistName": "...", ... } ] }
```

---

### `GET /api/track-meta?title=Blinding+Lights&artist=The+Weeknd`

Returns BPM, musical key, Camelot notation, and time signature from GetSongBPM.

**Response:**
```json
{ "bpm": 171, "key": "A Minor", "camelot": "8A", "timeSignature": "4/4" }
```

---

### `GET /api/qrcode?url=https://playd.app/request/...`

Returns a QR code PNG for the given URL. Used by the DJ dashboard to display a scannable join link.

---

## Database Schema

Core tables (all in the `public` schema):

### `dj_profiles`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `email` | text | Unique |
| `dj_name` | text | Display name |
| `stripe_account_id` | text | Nullable, for payouts |

### `events`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `dj_id` | UUID | FK → dj_profiles |
| `name` | text | Event name |
| `event_code` | text | Short join code (e.g. `FUNK42`) |
| `status` | text | `draft` / `live` / `ended` |

### `guest_sessions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `event_id` | UUID | FK → events |
| `display_name` | text | Guest's chosen name |
| `joined_at` | timestamptz | Auto-set |

### `tracks`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `spotify_id` | text | Unique — stores iTunes `trackId` |
| `title`, `artist`, `album` | text | |
| `album_art_url` | text | iTunes artwork URL |
| `spotify_url` | text | iTunes 30s preview URL |
| `bpm`, `key` | numeric/text | From GetSongBPM |

### `requests`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `event_id` | UUID | FK → events |
| `session_id` | UUID | FK → guest_sessions |
| `track_id` | UUID | FK → tracks |
| `status` | text | `pending` / `seen` / `saved` / `played` / `skipped` / `cancelled` |
| `priority_score` | numeric | Boost amount in dollars (0 = free) |
| `message` | text | Optional note from guest |
| `submitted_at` | timestamptz | Auto-set |
| `resolved_at` | timestamptz | Set on terminal status |

### `payments`
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `request_id` | UUID | FK → requests (unique) |
| `gross_amount` | numeric | Amount paid by guest |
| `stripe_payment_intent_id` | text | Stripe reference |

---

## Real-Time Architecture

The DJ dashboard subscribes to Supabase Realtime using `postgres_changes` on the `requests` table, filtered by `event_id`. This is powered by PostgreSQL logical replication (via the `supabase_realtime` publication) and Phoenix Channels — capable of handling millions of concurrent WebSocket connections.

```
Guest submits request
  → POST /api/requests (service role insert)
  → PostgreSQL writes row
  → supabase_realtime publication broadcasts change
  → DJ dashboard receives INSERT event via WebSocket
  → Follow-up SELECT joins track + session data
  → Card appears in queue with animation
```

**Scalability:** At 1,000+ concurrent guests, each guest generates at most one INSERT per request. The dashboard holds a single WebSocket connection per DJ. Supabase's free tier supports 200 concurrent Realtime connections; paid tiers scale to tens of thousands.

---

## What's Not Yet Wired

| Feature | Status |
|---------|--------|
| DJ authentication (login/signup) | UI built, Supabase Auth not integrated |
| Stripe payment processing | Schema ready, no handlers |
| Guest real-time status updates | Backend only; no guest-facing "your request was played" UI |
| Event creation by DJ | No UI yet |
| NestJS backend | Exists but frontend doesn't use it |
