# Courtside: pickleball web app

A web app with a **player side** (book courts, open play, live lineups and queue) and a **venue side** (dashboard, and next: schedule, check-ins, scoring). npm-workspaces monorepo; Node 22.

## Layout

- `apps/api`: Express + TypeScript + Prisma + Socket.IO + Zod + JWT + pino. HTTP in `*.routes.ts`, rules in `*.service.ts`; both sides share services. Endpoint reference: `apps/api/README.md`.
- `apps/web`: React 19 + Vite 8 + React Router 7 + TanStack Query 5 + Tailwind 4. Pages in `src/features/<area>/`, shared UI in `src/components/`, API client in `src/lib/api.ts`. See `apps/web/README.md`.
- `design/prototype.html`: the original clickable prototype, the visual reference. Court blue `#1D4E89`, kitchen green `#3E8E5E`, ball yellow `#F2D43B`, Archivo font, top-down court diagrams, light and dark mode.
- `docs/`: getting started, architecture, queue rules, deployment, roadmap. `CONTRIBUTING.md`: branches and commits.

## Commands (repo root)

`npm run dev` (API :4000 + web :5173), `npm test`, `npm run lint`, `npm run typecheck`, `npm run format`, `npm run build`, `npm run db:up`. Database: `npm run db:migrate|db:seed|db:reset -w @courtside/api`. Seed logins: `andrea.cruz@player.test`, `owner@rallyhouse.test`, password `password123`.

## Branches

`main` (production) ← `develop` (integration) ← `be-main` (backend) / `fe-main` (frontend). Backend work branches `be-<topic>` from `be-main`, frontend `fe-<topic>` from `fe-main`; also `docs/<topic>`, `chore/<topic>`. Merge with `--no-ff`. Conventional Commits with `api`/`web` scopes.

## Decisions already made

- **Database is Supabase (PostgreSQL)**, used only as a database; auth and realtime stay in the API. `DATABASE_URL` = transaction pooler (:6543, `?pgbouncer=true`), `DIRECT_URL` = session pooler (:5432) for Prisma Migrate. Local dev and CI use Postgres 16 in Docker.
- **Every table has Row Level Security enabled with no policies** (blocks Supabase's Data API; the API connects as owner). New tables must enable RLS in their migration; `apps/api/src/test/rls.test.ts` enforces it.
- Money is integer centavos (₱400 = 40000), currency PHP; payment methods CASH, GCASH, MAYA, CARD.
- Times are stored in UTC; each venue has a time zone (default `Asia/Manila`) for hours, pricing and "today".
- Double-booking is prevented twice: serializable transactions in services, plus Postgres exclusion constraints (migration `*_no_overlap_constraints`, needs `btree_gist`).
- Errors are `{ error: { code, message } }`; messages are written to be shown to users directly.
- One account type: a user becomes venue owner/manager/staff through `VenueStaff`. Owners can switch to the player side.
- **Open play queue** is the paddle-stack rotation (`docs/queue-rules.md`): 2 on/2 off with winners staying and splitting, 2-game streak cap, 4 on/4 off at 8+ waiting. Pure rules in `apps/api/src/modules/queue/rotation.ts`; state in `QueueEntry`; other modules use only `QueueStrategy` (`queue.types.ts`).
- The web app keeps server data in TanStack Query; Socket.IO events trigger refetches rather than patching state.

## Open items

See `docs/roadmap.md`: online payments, refund policy, rating formula, per-venue queue settings, whether to adopt Supabase Auth, venue-side web pages (schedule, open play management, bookings, settings), password reset emails, staff invites, push notifications, Zod 4 upgrade (open `npm audit` advisory on Zod 3), httpOnly cookie auth, Socket.IO Redis adapter.
