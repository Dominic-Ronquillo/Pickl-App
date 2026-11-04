# Courtside: pickleball platform

Two web apps on one API: the **player app** (book courts, open play, live lineups and queue) and the **venue app** for owners and staff (dashboard; next: schedule, check-ins, scoring). npm-workspaces monorepo, one repository; Node 22.

## Layout

- `apps/api`: Express + TypeScript + Prisma + Socket.IO + Zod + JWT + pino. HTTP in `*.routes.ts`, rules in `*.service.ts`; both sides share services. Endpoint reference: `apps/api/README.md`.
- `apps/player` (:5173) and `apps/venue` (:5174): React 19 + Vite 8 + React Router 7 + TanStack Query 5 + Tailwind 4. Pages in `src/features/<area>/`. Each app signs in as its own side (`<Providers side=...>`); separate sessions, linked to each other for owners who play.
- `packages/client` (API client, auth, format, realtime, types, app URLs) and `packages/ui` (theme, UI kit, AppShell, SignInForm, CourtDiagram): shared by both apps, consumed as source. Apps never import from each other. See `packages/README.md`.
- `design/prototype.html`: the original clickable prototype, the visual reference. `Courtside_pickleball_app.html` (repo root) is a newer revision a collaborator maintains: no phone frame, an `--accent` token, 44px tap targets; not yet carried into the apps. Court blue `#1D4E89`, kitchen green `#3E8E5E`, ball yellow `#F2D43B`, Archivo font, top-down court diagrams, light and dark mode.
- `docs/`: getting started, architecture, queue rules, deployment, roadmap. `CONTRIBUTING.md`: branches and commits.

## Commands (repo root)

`npm run dev` (API :4000, player :5173, venue :5174), `npm test`, `npm run lint`, `npm run typecheck`, `npm run format`, `npm run build`, `npm run db:up`. Database: `npm run db:migrate|db:seed|db:reset -w @courtside/api`. Seed logins: `andrea.cruz@player.test`, `owner@rallyhouse.test`, password `password123`.

## Branches

`main` is a docs-only front page (README, CONTRIBUTING, docs, prototype; never merge code into it). `develop` holds the code and release tags ← `be-main` (backend) / `fe-main` (both web apps and packages). Backend work branches `be-<topic>` from `be-main`; frontend `fe-player-<topic>`, `fe-venue-<topic>` or `fe-<topic>` (shared) from `fe-main`; also `docs/<topic>`, `chore/<topic>`. Merge with `--no-ff`. Conventional Commits with `api`/`web` scopes.

## Decisions already made

- **Database is Supabase (PostgreSQL)**, used only as a database; auth and realtime stay in the API. `DATABASE_URL` = transaction pooler (:6543, `?pgbouncer=true`), `DIRECT_URL` = session pooler (:5432) for Prisma Migrate. Local dev and CI use Postgres 16 in Docker.
- **Every table has Row Level Security enabled with no policies** (blocks Supabase's Data API; the API connects as owner). New tables must enable RLS in their migration; `apps/api/src/test/rls.test.ts` enforces it.
- Money is integer centavos (₱400 = 40000), currency PHP; payment methods CASH, GCASH, MAYA, CARD.
- Times are stored in UTC; each venue has a time zone (default `Asia/Manila`) for hours, pricing and "today".
- Double-booking is prevented twice: serializable transactions in services, plus Postgres exclusion constraints (migration `*_no_overlap_constraints`, needs `btree_gist`).
- Errors are `{ error: { code, message } }`; messages are written to be shown to users directly.
- One account type: a user becomes venue owner/manager/staff through `VenueStaff`. The same login works in both apps; the venue app signs in with `as: "venue"` (403 `NOT_VENUE_STAFF` otherwise).
- Player and venue are separate apps in the same repo (decided 2026-11-04): separate addresses and releases, shared packages, one API.
- **Open play queue** is the paddle-stack rotation (`docs/queue-rules.md`): 2 on/2 off with winners staying and splitting, 2-game streak cap, 4 on/4 off at 8+ waiting. Pure rules in `apps/api/src/modules/queue/rotation.ts`; state in `QueueEntry`; other modules use only `QueueStrategy` (`queue.types.ts`).
- The web apps keep server data in TanStack Query; Socket.IO events trigger refetches rather than patching state.

## Open items

See `docs/roadmap.md`: online payments, refund policy, rating formula, per-venue queue settings, whether to adopt Supabase Auth, venue-side web pages (schedule, open play management, bookings, settings), password reset emails, staff invites, push notifications, Zod 4 upgrade (open `npm audit` advisory on Zod 3), httpOnly cookie auth, Socket.IO Redis adapter.
