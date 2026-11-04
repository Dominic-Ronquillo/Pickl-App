# Deployment

Production has four parts:

| Part       | What                             | Where it runs                                           |
| ---------- | -------------------------------- | ------------------------------------------------------- |
| Database   | PostgreSQL                       | **Supabase**                                            |
| API        | `apps/api` Docker image          | Any container host that supports WebSockets (Socket.IO) |
| Player app | `apps/player/dist`, static files | Any static host or CDN, e.g. `app.example.com`          |
| Venue app  | `apps/venue/dist`, static files  | Any static host or CDN, e.g. `venue.example.com`        |

## Database: Supabase

Courtside uses Supabase only as the PostgreSQL database. Accounts, sign-in and live updates are handled by the API itself, so Supabase Auth, Storage and Realtime aren't used.

### Create the project

1. Create a Supabase project in the region closest to your players. For players in the Philippines, Southeast Asia (Singapore) is the closest.
2. Open **Connect** (or **Project Settings → Database → Connection string**) and copy two strings:
   - **Transaction pooler** (port **6543**). Append `?pgbouncer=true` and use it as `DATABASE_URL`. The API uses this connection.
   - **Session pooler** (port **5432**). Use it as `DIRECT_URL`. Prisma Migrate needs a session connection, and the session pooler also works on networks without IPv6.

```bash
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

3. Apply the migrations:

```bash
DATABASE_URL=... DIRECT_URL=... npm run db:deploy -w @courtside/api
```

The API image also runs `prisma migrate deploy` on start-up (see below), so this step is only needed when you deploy without the image.

The migrations enable the `btree_gist` extension, which the no-double-booking constraints need. Supabase allows it.

### Row Level Security

Supabase serves every table in the `public` schema through its Data API, and the project's public `anon` key is enough to call it. Courtside never uses that API, so a migration enables **Row Level Security on every table with no policies**:

- Through the Data API, the tables are empty and can't be written.
- The Courtside API connects as the tables' owner, and owners bypass RLS, so it keeps full access.

A test (`apps/api/src/test/rls.test.ts`) fails if a migration creates a table without enabling RLS. When you add a table, put `ALTER TABLE "<Table>" ENABLE ROW LEVEL SECURITY;` in its migration.

For extra protection, you can also turn off the Data API under **Project Settings → Data API**.

### Recommended settings

- **Keep the database password out of the repository.** Set `DATABASE_URL` and `DIRECT_URL` only in the host's secret store.
- **Backups.** Daily backups are included on paid plans. Point-in-time recovery is an add-on.
- **Dedicated database user (optional).** Supabase's Prisma guide suggests creating a `prisma` user instead of using `postgres`. If you do, make that user the owner of the tables, so it keeps bypassing RLS.

## API

Build from the repository root:

```bash
docker build -f apps/api/Dockerfile -t courtside-api .
docker run -p 4000:4000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=... -e DIRECT_URL=... \
  -e JWT_SECRET=... \
  -e CORS_ORIGIN=https://app.example.com \
  courtside-api
```

- The container applies pending migrations, then starts the API. When you run several instances, run migrations once from CI and start the containers with `node dist/server.js`.
- Point health checks at `GET /api/health`. It returns `503` while the database is unreachable.
- Logs are JSON on stdout.
- The host must support WebSockets for live lineups. Behind a load balancer, either enable sticky sessions or run a single instance until a Socket.IO adapter is added (on the [roadmap](roadmap.md)).
- `app.set('trust proxy', 1)` assumes exactly one proxy in front of the API, so the rate limiter sees real client IPs. Change it if your setup differs.

## Web apps

```bash
export VITE_API_URL=https://api.example.com
export VITE_PLAYER_APP_URL=https://app.example.com
export VITE_VENUE_APP_URL=https://venue.example.com
npm run build -w @courtside/player     # → apps/player/dist
npm run build -w @courtside/venue      # → apps/venue/dist
```

- Deploy each `dist/` folder as its own site, on its own subdomain.
- Configure a single-page-app fallback: unknown paths must serve `index.html`.
- `VITE_API_URL` is read at build time. Leave it empty if the host proxies `/api` and `/socket.io` to the API on the same domain. That's the simplest setup, because it needs no CORS.
- `VITE_PLAYER_APP_URL` and `VITE_VENUE_APP_URL` set the links between the two apps.
- Add both apps' origins to the API's `CORS_ORIGIN`, comma-separated.

## Release checklist

1. CI is green on `develop`.
2. Tag `develop`: `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. Run `db:deploy` against Supabase, or let the image do it.
4. Deploy the API, then the player and venue apps.
5. Check `/api/health`, sign in, and book and cancel a test court.
