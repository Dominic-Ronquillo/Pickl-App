# Courtside: pickleball app

Mobile pickleball app with a **player side** and a **business (venue) side**.
This file carries over the context from the planning chat so work can continue here.

## Repository layout

- `prototype/index.html`: clickable mobile UI prototype (single HTML file, vanilla JS, no build). Open it in a browser.
- `api/`: backend (Node.js 20+, TypeScript, Express, PostgreSQL + Prisma, Socket.IO, Zod, JWT). See `api/README.md` for setup, every endpoint and real-time events.

## Features

Player side: Home (next booking, rating, stats, nearby open play, recent games), Open play (sessions by skill level, join/leave), Book (court-by-hour grid, 1 or 2 hours, peak pricing from 5 PM), Lineups (live court diagrams with scores, "Up next").

Venue side: Dashboard (revenue, hourly chart, court use, check-ins, courts right now), Schedule (court × hour grid, walk-ins, maintenance blocks), Open play (create sessions, check players in), Bookings (upcoming, unpaid, cancelled; mark paid).

Accounts: one account type. A user is a player by default and becomes a venue owner/manager/staff through `VenueStaff`. Sign-in has a Player / Venue owner choice; owners can switch to the player side. Venue sign-up is two steps in the UI (owner account, then venue details) but one API call: `POST /api/auth/register-venue`. Existing players can add a venue with `POST /api/me/venues`.

## Decisions already made

- Money is stored as integer centavos (₱400 = 40000). Currency is PHP; payment methods CASH, GCASH, MAYA, CARD.
- Times are stored in UTC; each venue has a time zone (default `Asia/Manila`) for hours, pricing and "today".
- Double-booking is prevented twice: serializable transactions in services, plus Postgres exclusion constraints in the `no_overlap_constraints` migration under `apps/api/prisma/migrations/`.
- Modules keep HTTP in `*.routes.ts` and rules in `*.service.ts`; both sides share services.
- Errors are `{ error: { code, message } }`; messages are written to be shown to users directly.

## Pending: the open play queue

The user will provide the queue rules. The queue is isolated behind `api/src/modules/queue/queue.types.ts` (`QueueStrategy`). `queue.service.ts` is a placeholder: hooks are no-ops, "Up next" is empty, queue endpoints return `501 QUEUE_NOT_READY`. To build it: add tables to `schema.prisma`, implement `QueueStrategy`, export it from `queue.service.ts`. In the prototype, the queue shows as a dashed placeholder on the session detail screen and the venue Open play tab ("Assign courts" is disabled).

## Other open items

Online payment checkout (create bookings PENDING, confirm via webhook), refund policy, rating updates after games, password reset emails (`/auth/forgot-password` is stubbed), inviting staff, push notifications.

## Notes

- The prototype stores demo accounts in the browser (localStorage). Demo logins: `andrea.cruz@player.test` and `owner@rallyhouse.test`, password `password123`.
- The prototype's visual style: court blue `#1D4E89`, kitchen green `#3E8E5E`, ball yellow `#F2D43B`, Archivo font, top-down court diagrams as the signature element. Light and dark mode.
- The backend type-checks but hasn't been run against a live database yet; the first `npm run db:migrate` is its first full test.
