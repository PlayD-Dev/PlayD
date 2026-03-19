# API Wiring — How It Works

This document explains the three API integrations wired up in the frontend, how each one flows,
and what you need to do manually before they work.

---

## Overview

| API | What it does | Key required | Who calls it |
|---|---|---|---|
| iTunes Search | Song search with artwork + preview | No | Browser → `/api/search` → iTunes |
| GetSongBPM | BPM, musical key, time signature | Yes (server-side) | Browser → `/api/track-meta` → GetSongBPM |
| QR Code | Generates a PNG QR for the guest join URL | No | Browser → `/api/qrcode` (no external call) |

All three are tested on a single dev page at **`/test`**.

---

## File Structure

```
frontend/src/
├── lib/
│   ├── itunes.ts          # iTunes fetch function + TypeScript types
│   └── getsongbpm.ts      # GetSongBPM fetch function + types (server-only)
└── app/
    ├── api/
    │   ├── search/
    │   │   └── route.ts   # GET /api/search?q=...
    │   ├── track-meta/
    │   │   └── route.ts   # GET /api/track-meta?title=...&artist=...
    │   └── qrcode/
    │       └── route.ts   # GET /api/qrcode?eventId=...
    └── test/
        └── page.tsx        # Visual test page (dev only)

frontend/
├── .env.example            # Template — copy to .env.local
```

---

## 1 — iTunes Search

### How it flows

```
User types in search box (400ms debounce)
  → fetch('/api/search?q=...')
    → Next.js route handler (app/api/search/route.ts)
      → fetch('https://itunes.apple.com/search?...')
        → Returns { tracks: ItunesTrack[] }
```

### Why proxy through Next.js?

iTunes has CORS open so you _could_ call it directly from the browser, but routing through
our API route gives us:
- A single place to swap providers later (e.g. Spotify instead)
- Server-side response caching (`next: { revalidate: 60 }`)
- Rate limit protection — all requests come from one server IP

### Debouncing

The test page debounces the query by **400ms**. When you build the real guest search UI,
keep this — the iTunes rate limit is ~20 req/sec per IP and hitting it from many concurrent
guests at the same party is realistic.

```typescript
// Pattern to reuse in the real guest search component
const debouncedQuery = useDebounce(query, 400)

useEffect(() => {
  if (!debouncedQuery) return
  fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
    .then(r => r.json())
    .then(d => setTracks(d.tracks))
}, [debouncedQuery])
```

### Response shape

```typescript
// GET /api/search?q=blinding+lights
{
  tracks: [
    {
      trackId: 1488408568,
      trackName: "Blinding Lights",
      artistName: "The Weeknd",
      collectionName: "After Hours",
      artworkUrl100: "https://is1-ssl.mzstatic.com/.../100x100bb.jpg",
      previewUrl: "https://audio-ssl.itunes.apple.com/.../preview.m4a",
      trackTimeMillis: 200040,
      primaryGenreName: "Pop"
    },
    ...
  ]
}
```

**Tip:** The `artworkUrl100` can be resized by replacing `100x100bb` with `300x300bb` or `600x600bb`.
The `artworkUrl()` helper in `lib/itunes.ts` does this for you.

### What needs to be done manually

Nothing — iTunes requires no API key. It works immediately.

---

## 2 — GetSongBPM (BPM + Musical Key)

### How it flows

```
User selects a track from search results
  → fetch('/api/track-meta?title=...&artist=...')
    → Next.js route handler reads GETSONGBPM_API_KEY from env
      → fetch('https://api.getsongbpm.com/search/?api_key=KEY&...')
        → Returns { bpm, key, openKey, timeSig }
```

### Why it must stay server-side

The GetSongBPM API key must **never** be exposed to the browser. The `/api/track-meta` route
reads `process.env.GETSONGBPM_API_KEY` server-side and never sends it to the client.
The `lib/getsongbpm.ts` file is server-only — do not import it in any Client Component.

### Response shape

```typescript
// GET /api/track-meta?title=Blinding+Lights&artist=The+Weeknd
{
  bpm: "171",
  key: "A Major",
  openKey: "11B",    // Camelot / Open Key notation — useful for harmonic mixing
  timeSig: "4/4"
}
```

### Caching

BPM data doesn't change, so responses are cached for **1 hour** (`next: { revalidate: 3600 }`).
This means a song requested 10 times in one night only hits the GetSongBPM API once.

### Rate limit

Free plan: **3,000 requests/hour**. With 1-hour caching per track this is more than enough
for a busy night, but keep it in mind if you disable caching during development.

### What needs to be done manually

1. Go to [getsongbpm.com/api](https://getsongbpm.com/api) and create a free account.
2. Copy your API key.
3. Add it to `frontend/.env.local`:
   ```
   GETSONGBPM_API_KEY=your-key-here
   ```
4. Restart the dev server (`npm run dev`).

The `/test` page health check will show a green badge once the key is configured.
If it shows red, the `/api/track-meta` endpoint returns a 500 with a clear error message.

---

## 3 — QR Code

### How it flows

```
DJ provides an eventId
  → fetch('/api/qrcode?eventId=...')
    → Next.js route handler uses `qrcode` npm package (no external API)
      → Returns a PNG image (Content-Type: image/png)
```

### What the QR encodes

The QR code contains a URL in the format:

```
{NEXT_PUBLIC_APP_URL}/join/{eventId}
```

For example: `https://playd.app/join/abc-123`

When guests scan it, they land on the guest join page for that specific event.
You can also pass `?joinCode=FUNK42` instead of an eventId if you want the short-code flow.

### Response

The endpoint returns raw PNG bytes, not JSON. You can use it directly as an `<img>` `src`:

```tsx
<img src={`/api/qrcode?eventId=${event.id}`} alt="Scan to join" width={300} height={300} />
```

Or download it programmatically — the test page has a download link demonstrating this.

### What needs to be done manually

1. Set `NEXT_PUBLIC_APP_URL` in `.env.local` to your real domain in production:
   ```
   NEXT_PUBLIC_APP_URL=https://playd.app
   ```
   In development this defaults to `http://localhost:3000` automatically.
2. The `qrcode` package is already installed — nothing else needed.

---

## Running the Test Page

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local and add your GETSONGBPM_API_KEY
npm run dev
```

Then open **[http://localhost:3000/test](http://localhost:3000/test)**.

The page has three sections:

1. **iTunes Search** — type anything, results appear after 400ms. Click a track to select it.
2. **BPM + Key** — automatically fetches metadata for whichever track you selected.
3. **QR Code** — enter any string as an event ID and click Generate.

There is also a **raw response inspector** at the bottom that shows the full iTunes JSON
for the selected track — useful for checking all available fields.

---

## Environment Variables Summary

Copy `frontend/.env.example` to `frontend/.env.local` and fill in:

| Variable | Required for | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | QR code URLs | Set to your domain in prod |
| `GETSONGBPM_API_KEY` | BPM + key lookup | [getsongbpm.com/api](https://getsongbpm.com/api) — free |
| `NEXT_PUBLIC_SUPABASE_URL` | Auth + database | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth + database | Supabase dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB writes | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Payments UI | Stripe dashboard → Developers → API keys |
| `STRIPE_SECRET_KEY` | Payment backend | Stripe dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks | Stripe CLI or dashboard → Webhooks |

iTunes requires no key and needs no entry in `.env.local`.

---

## What Is NOT Wired Yet

| Feature | Status | Notes |
|---|---|---|
| Stripe payments | Not wired | Needs `STRIPE_SECRET_KEY` + webhook handler |
| Supabase auth (DJ login) | Not wired | Needs `NEXT_PUBLIC_SUPABASE_URL` + client setup |
| Supabase DB (saving requests) | Not wired | Needs service role key + schema from `docs/supabase-setup.md` |
| WebSocket real-time | Not wired | See `docs/Websocket Documentation.pdf` |

---

## Removing the Test Page Before Launch

The `/test` page is for development only. Before going live, either:

- Delete `frontend/src/app/test/` entirely, or
- Add a middleware check that blocks it in production:

```typescript
// frontend/src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/test') && process.env.NODE_ENV === 'production') {
    return NextResponse.redirect(new URL('/', req.url))
  }
}
```
