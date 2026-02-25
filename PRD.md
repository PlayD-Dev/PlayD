# PlayD — Product Requirements Document (PRD)

## Overview

PlayD is a two-sided application that lets partygoers request songs for a DJ through a Spotify-like browsing and search interface. Guests can submit free requests or pay to boost priority (e.g., $5 request with a $1 platform fee), which ranks the song higher in the DJ's queue. Each request includes track metadata (BPM, key, track/artist) plus context: who requested it, how long it's been waiting, and an optional short message.

On the DJ side, PlayD provides a real-time dashboard to view and manage the request queue, filter free vs. paid requests, sort by priority and waiting time, and mark outcomes (played/skipped/saved). PlayD monetizes by taking a fee from paid boosts while still allowing free requests to keep the experience inclusive.

---

## OKRs (Objectives & Key Results)

**Objective 1: Make requesting fast, accurate, and contextual for guests**
- KR1: Median time from search to successful request submission ≤ 30 seconds
- KR2: ≥ 90% of requests attach to a valid track entity (minimizes typos/ambiguity)
- KR3: ≥ 95% of requests include BPM + key on the DJ view (via integrated metadata or fallback logic)

**Objective 2: Give DJs a clean workflow to triage and act on requests in real time**
- KR1: DJ can filter between Free vs. Paid and see priority-ranked queue in ≤ 2 interactions from landing
- KR2: New requests appear on the DJ dashboard with median latency ≤ 2 seconds
- KR3: Each queue item displays track/artist, BPM, key, requester, time since first requested, and message with ≥ 99% field render success (when data exists)

**Objective 3: Validate monetization that is transparent and doesn't harm DJ control**
- KR1: Payment success rate ≥ 98% for paid boosts (excluding user abandonment)
- KR2: 100% of paid transactions log gross amount, platform fee, and DJ payout in a ledger

---

## User Flows

### Workflow 1: Guest Request Flow
1. Open PlayD
2. Join event via QR code or event code
3. Enter display name
4. Search songs
5. Select song
6. Add optional message + optional boost
7. If boost selected → Pay → Submit request
8. If no boost → Submit request
9. Request appears in "My Requests"
10. Live status updates: Pending → Seen → Played / Skipped / Saved

### Workflow 2: DJ Interaction Flow
1. DJ opens PlayD DJ dashboard
2. Start / Resume event
3. Queue dashboard loads
4. Incoming requests stream in real-time
5. DJ filters view: Paid / Free / All
6. Sort by: priority / time / BPM / key / recency
7. Select a request row → view details (BPM, key, time waiting, requester, message)
8. DJ decision: Mark Seen → status update to guest | Play → Mark Played + timestamp | Skip → Mark Skipped | Save → Save to crate/list
9. Request moves to History

---

## Features & Requirements

### MVP Phase (Weeks 1–3)
Goal: Working guest request → DJ queue loop for one live event.

**1. Event Join (QR / Event Code) — S (3–5 days)**
- Req: DJ starts event → generates code + QR. Guests join via code/QR.
- Verification: valid join routes correctly; invalid code errors; DJ can end event.

**2. Guest Search + Request (single track) — M (1–1.5 weeks)**
- Req: Spotify-like search → select track → submit request (+ optional message).
- Verification: request reaches DJ view quickly; guest sees pending status.

**3. DJ Queue (core list + status) — M (1–1.5 weeks)**
- Req: DJ sees queue with track/artist, BPM, key, requester, time-waiting, message icon; can mark Seen/Played/Skipped.
- Verification: status updates reflect on guest side.

**4. BPM + Key Enrichment (best-effort) — S–M (3–7 days)**
- Req: store BPM/key when available; show "—" if missing.
- Verification: DJ view displays metadata for most tracks.

**5. DJ Login (basic auth) — S (2–4 days)**
- Req: only DJs can access DJ dashboard / start events.
- Verification: protected routes enforced.

---

### Main Build Phase (Weeks 4–7)
Goal: Monetization + scalable queue management.

**6. Payments + Boosted Priority + Platform Fee Ledger — L (2–3 weeks)**
- Req: guest pays tiered boost; platform fee recorded; DJ sees boosted ranking.
- Verification: fee breakdown shown pre-pay; paid labeled; ledger totals reconcile.

**7. DJ Filters / Sorting — M (1 week)**
- Req: filter All/Paid/Free; sort by priority/time/BPM/key/recency.
- Verification: stable sorting; fast UI.

**8. Message + Mic Note Controls — M (1 week)**
- Req: optional guest message + mic-allowed flag; DJ can disable mic notes globally.
- Verification: message visible; mic tag honored by DJ settings.

**9. Real-time Updates (queue + statuses) — M (1–1.5 weeks)**
- Req: DJ queue updates live; guest status updates live.
- Verification: near-real-time propagation.

**10. DJ Event Controls — S–M (4–7 days)**
- Req: pause requests; toggle free/paid; set tiers; end event.
- Verification: paused/ended states enforced for guests.

---

### Stretch Goals Phase (Weeks 8–9)

**11. Export / DJ Software-Friendly Output (CSV) — M (1 week)**
- Req: export queue with metadata + messages/requesters.
- AC: correct file + columns.

**12. Analytics + Post-event Summary — M–L (1–2 weeks)**
- Req: stats: requests, boosts, wait time, played rate, top tracks.
- AC: per-event dashboard + export.

---

## Solution Discovery

- **User research:** 5–8 quick interviews (3–4 DJs, 2–4 frequent partygoers) to confirm pain points, must-have metadata (BPM/key), and what "fair" paid priority looks like.
- **Prototype testing:** Low-fi Figma of both dashboards; run task tests (submit request, DJ triage) and measure time-to-complete + confusion points.
- **Pilot events:** 2 small live trials (one house party, one campus event). Track metrics: requests/min, % duplicates, median wait time, % played, and paid boost conversion.

---

## Architecture

```
Frontend (Next.js + React)
  ├── Guest Web App  →  Join event, Search, My Requests (status)
  └── DJ Web App     →  Event controls, Live queue + filters, Request detail

        ↕ REST + WebSocket/SSE

Backend API (NestJS)
  ├── Auth, Events, Requests, Payments
  └── Background Worker (metadata enrichment, ledger)

        ↕

External Services
  ├── Spotify Web API     (track search + metadata)
  ├── BPM/Key Provider    (AcousticBrainz or paid API)
  └── Stripe              (payments)

        ↕

PostgreSQL (events, users, requests, payments, ledger)
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (React) + WebSockets client |
| API | Node.js (NestJS) — REST + WebSocket/SSE |
| Database | PostgreSQL |
| Payments | Stripe |
| Music Search | Spotify Web API |
| BPM/Key Metadata | AcousticBrainz or paid audio-features provider |
| Background Jobs | Worker process (metadata enrichment, receipts) |

### Design Approaches

**Layered architecture**
- Controllers (REST) → Services (business logic) → Repositories (DB)
- Keeps queue/payments logic testable and clean

**Event-driven worker pattern**
- Request created → enqueue "metadata enrichment" job → update request with BPM/key
- Avoids blocking the user flow on external APIs

### Key Tradeoffs

- **REST vs GraphQL:** REST is simpler for queue/payments; GraphQL adds schema overhead.
- **Postgres vs Mongo:** Postgres fits payments integrity + relational queries; Mongo is flexible but harder for strict accounting.
- **Node vs FastAPI:** Node is smoother for realtime; FastAPI is fast to build typed REST.
