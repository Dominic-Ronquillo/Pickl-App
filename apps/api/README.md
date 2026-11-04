# Courtside API

Backend for the Courtside pickleball app: player side (open play, court booking, lineups, stats)
and venue side (dashboard, schedule, check-ins, bookings, scoring).

**Stack:** Node.js 20+, TypeScript, Express, PostgreSQL + Prisma, Socket.IO for live updates, Zod for validation, JWT auth.

## Getting started

```bash
cp .env.example .env            # set JWT_SECRET
docker compose up -d            # Postgres on :5432
npm install
npm run db:migrate              # creates tables and the no-double-booking constraints
npm run db:seed                 # 3 venues, 4 courts each, one owner, 8 players
npm run dev                     # http://localhost:4000/api
```

Seed logins (password `password123`): `owner@rallyhouse.test` (venue side), `andrea.cruz@player.test` (player).

## Folder structure

```
prisma/
  schema.prisma             data model
  migrations/               SQL migrations, including the no-overlap exclusion constraints
  seed.ts
src/
  server.ts                 HTTP + Socket.IO bootstrap
  app.ts                    Express app, middleware, error handling
  routes.ts                 mounts every module under /api
  config/env.ts             validated environment variables
  lib/                      prisma client, HTTP errors, venue time zones, pricing
  middleware/               auth (JWT + venue roles), zod validation, error handler
  realtime/socket.ts        rooms and event names
  modules/
    auth/                   register, login
    me/                     player profile, stats, my bookings, my games
    venues/                 venue list, court availability grid
    bookings/               create and cancel court bookings (player)
    openplay/               sessions, join/leave, check-in logic
    games/                  start game, live score, end game, lineups
    queue/                  queue contract + placeholder (see below)
    business/               venue-side routes: dashboard, schedule, blocks, bookings, open play, games, settings
```

Each module keeps HTTP concerns in `*.routes.ts` and business rules in `*.service.ts`, so services can be reused by both sides (e.g. `createBooking` serves player bookings and staff walk-ins).

## Data model

| Table                              | Purpose                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `User`                             | Every account. A user becomes venue staff through `VenueStaff`.             |
| `VenueStaff`                       | User's role at a venue: `OWNER`, `MANAGER`, `STAFF`.                        |
| `Venue`, `Court`                   | Venues with time zone and opening hours; numbered courts.                   |
| `PricingRule`                      | Price per court-hour by weekday and time band (e.g. ₱500 after 5 PM).       |
| `Booking`                          | A court reservation by a player or a staff walk-in.                         |
| `CourtBlock`                       | Time a court can't be booked: maintenance, events, open play.               |
| `OpenPlaySession`, `OpenPlayCourt` | A session, its skill level, capacity, fee and courts.                       |
| `OpenPlayRegistration`             | A player's place in a session: joined, checked in, left, no-show.           |
| `Game`, `GamePlayer`               | One game on one court, teams A and B, live score. Powers lineups and stats. |
| `Payment`                          | Cash, GCash, Maya or card payments for bookings and session fees.           |

Money is stored in centavos (`40000` = ₱400). Times are stored in UTC; each venue's time zone (default `Asia/Manila`) decides opening hours, peak pricing and what "today" means.

**Double-booking protection** has two layers: services check inside serializable transactions for friendly error messages, and Postgres exclusion constraints reject any overlap that slips through under concurrency (returned as `409 SLOT_TAKEN`).

## API

All routes are under `/api`. Everything except `/health` and `/auth/*` needs `Authorization: Bearer <token>`.

### Player side

| Method | Path                                            | Screen         | Notes                                                                                                                |
| ------ | ----------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register`                                | Player sign-up | `{ name, email, password, phone?, skillLevel }`; skill level sets the starting rating                                |
| POST   | `/auth/register-venue`                          | Venue sign-up  | Owner account + venue + courts + prices in one transaction (see below)                                               |
| POST   | `/auth/login`                                   | Sign in        | `{ email, password, as: "player" \| "venue" }`; `as: "venue"` returns `403 NOT_VENUE_STAFF` for player-only accounts |
| POST   | `/auth/forgot-password`                         | Reset password | Always `202`, so it never reveals whether an email has an account                                                    |
| GET    | `/me`                                           | Profile        |                                                                                                                      |
| GET    | `/me/stats`                                     | Home           | Games total, this month, win rate                                                                                    |
| GET    | `/me/bookings`                                  | Home, Book     | Upcoming bookings                                                                                                    |
| GET    | `/me/games`                                     | Home           | Recent results with partners and opponents                                                                           |
| GET    | `/me/open-play`                                 | Home           | Sessions I've joined                                                                                                 |
| POST   | `/me/venues`                                    | Profile        | A signed-in player registers a venue and becomes its owner                                                           |
| GET    | `/venues`                                       | Book           |                                                                                                                      |
| GET    | `/venues/:venueId/availability?date=YYYY-MM-DD` | Book           | Court × hour grid: `OPEN`, `BOOKED`, `MINE`, `OPEN_PLAY`, `BLOCKED`, `PAST`, with price                              |
| POST   | `/bookings`                                     | Book           | `{ courtId, startsAt, durationMinutes: 60 \| 90 \| 120 }`                                                            |
| POST   | `/bookings/:id/cancel`                          | Book           | Own bookings, before start time                                                                                      |
| GET    | `/open-play/sessions?level=&venueId=&from=&to=` | Open play      | Includes spots left and my status                                                                                    |
| GET    | `/open-play/sessions/:id`                       | Session detail | Courts, players, my status                                                                                           |
| POST   | `/open-play/sessions/:id/join`                  | Session detail | Enforces capacity and rating range                                                                                   |
| POST   | `/open-play/sessions/:id/leave`                 | Session detail |                                                                                                                      |
| GET    | `/open-play/sessions/:id/lineups`               | Lineups        | Live game per court + "Up next"                                                                                      |
| GET    | `/open-play/sessions/:id/queue`                 | Session detail | `501` until the queue is built                                                                                       |
| GET    | `/open-play/sessions/:id/queue/me`              | Session detail | `501` until the queue is built                                                                                       |

### Venue side — `/business/venues/:venueId/...`

Requires the user to be staff at that venue. Routes marked _managers_ need `OWNER` or `MANAGER`.

| Method | Path                                           | Screen             | Notes                                                                       |
| ------ | ---------------------------------------------- | ------------------ | --------------------------------------------------------------------------- |
| GET    | `/dashboard?date=`                             | Dashboard          | Revenue, hourly revenue, court use %, bookings, check-ins, courts right now |
| GET    | `/schedule?date=`                              | Schedule           | Bookings and blocks per court, with names                                   |
| POST   | `/blocks`                                      | Schedule           | Block a court for `MAINTENANCE` or `EVENT`                                  |
| DELETE | `/blocks/:blockId`                             | Schedule           | Reopen the court                                                            |
| GET    | `/bookings?filter=upcoming\|unpaid\|cancelled` | Bookings           |                                                                             |
| POST   | `/bookings`                                    | Schedule           | Walk-in booking, optional `paidWith`                                        |
| POST   | `/bookings/:id/paid`                           | Bookings           | `{ method: CASH \| GCASH \| MAYA \| CARD }`                                 |
| POST   | `/bookings/:id/cancel`                         | Bookings, Schedule |                                                                             |
| GET    | `/open-play/sessions?date=`                    | Open play          |                                                                             |
| POST   | `/open-play/sessions`                          | Open play          | _Managers._ Creates the session and blocks its courts                       |
| PATCH  | `/open-play/sessions/:id/status`               | Open play          | `LIVE`, `ENDED`, `CANCELLED`                                                |
| GET    | `/open-play/sessions/:id/roster`               | Open play          |                                                                             |
| POST   | `/open-play/sessions/:id/check-ins`            | Open play          | `{ userId, paidWith? }`                                                     |
| DELETE | `/open-play/sessions/:id/check-ins/:userId`    | Open play          | Undo check-in                                                               |
| POST   | `/open-play/sessions/:id/games`                | Lineups            | `{ courtId, teamA?, teamB? }`; omit teams to pull from the queue            |
| PATCH  | `/games/:gameId/score`                         | Lineups            | Live score                                                                  |
| POST   | `/games/:gameId/end`                           | Lineups            | Final score                                                                 |
| PATCH  | `/courts/:courtId`                             | Settings           | _Managers._ Rename or take a court out of service                           |
| PUT    | `/pricing`                                     | Settings           | _Managers._ Replace pricing rules                                           |

Errors always look like `{ "error": { "code": "SESSION_FULL", "message": "This session is full" } }`, so the app can show `message` directly and branch on `code`.

## Accounts: players and venue owners

There is one account type. A user is a **player** by default and becomes a **venue owner** (or manager/staff) through `VenueStaff`. That keeps sign-in simple and lets owners play too: one login, and the app offers a switch between the player and venue sides.

- **Player sign-up** → `POST /auth/register`, then the app opens the player side.
- **Venue sign-up** is two steps in the app (owner account, then venue details) but one request:

```json
POST /auth/register-venue
{
  "name": "Lea Ong", "email": "lea@smashyard.ph", "phone": "0917 123 4567", "password": "********",
  "venue": {
    "name": "Smash Yard", "address": "Pasig City", "courts": 6,
    "opensAtMinute": 360, "closesAtMinute": 1320,
    "offPeakCentsPerHour": 35000, "peakCentsPerHour": 45000, "peakStartsAtMinute": 1020
  }
}
```

- **Sign-in** returns `{ token, user, venues, mode }`. Show the venue side when `mode` is `venue`; show the "Switch to venue" option whenever `venues` isn't empty.
- **An existing player opening a venue** → `POST /me/venues` with the same `venue` object.

## Real-time (Socket.IO)

Connect with `io(URL, { auth: { token } })`, then emit `session:watch` with a session id, or `venue:watch` with a venue id (staff only). Each user is automatically in their own room.

| Event              | Room           | When                                                        |
| ------------------ | -------------- | ----------------------------------------------------------- |
| `lineup:updated`   | session        | A game starts or ends; payload is the full lineups response |
| `game:score`       | session        | Score changes                                               |
| `session:updated`  | session, venue | Join, leave, check-in, status change                        |
| `booking:changed`  | venue          | Booking created, cancelled or paid                          |
| `schedule:changed` | venue          | Anything that changes the schedule grid                     |
| `queue:your-turn`  | user           | Player has been put on a court                              |

## The queue (pending)

The open play queue is isolated behind `src/modules/queue/queue.types.ts`. Open play calls `onCheckIn` / `onLeave`, games call `takeNextGroup` and `onGameEnded`, and lineups call `peekNextGroups`. Right now `queue.service.ts` provides a placeholder: lifecycle hooks do nothing, "Up next" is empty, and the queue endpoints return `501 QUEUE_NOT_READY`. Staff can still start games by choosing four checked-in players.

To add the queue: add its tables to `schema.prisma`, implement `QueueStrategy`, and export it from `queue.service.ts`. No other module changes.

## Still to decide

- **Online payments:** bookings are created `CONFIRMED` + `UNPAID`. For GCash/Maya/card checkout, create them `PENDING` and confirm from the payment provider's webhook.
- **Refund policy** for cancelled bookings and sessions (`TODO` in `bookings.service.ts`).
- **Rating updates** after games (`TODO` in `games.service.ts`).
- **Password reset emails:** `/auth/forgot-password` is stubbed; add token storage and an email provider.
- **Inviting staff:** owners can't yet add managers or front-desk staff by email.
- **Push notifications** (e.g. "You're up on Court 2" when the app is closed); the `queue:your-turn` event is the hook.
