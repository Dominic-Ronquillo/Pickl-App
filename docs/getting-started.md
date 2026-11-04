# Getting started

## Prerequisites

- **Node.js 22.** The repository has an `.nvmrc`, so run `nvm use`. Node 20.19+ also works.
- **npm 10 or newer.** It comes with Node.
- **Docker**, for the local PostgreSQL database. A Postgres 16 you already run works too: point `DATABASE_URL` and `DIRECT_URL` at it.

Hosted environments use **Supabase**. To develop against a Supabase project instead of Docker, put its connection strings in `apps/api/.env` (see [deployment.md](deployment.md#database-supabase)). Use a separate project for development, never production.

## First run

```bash
npm install
npm run db:up
cp apps/api/.env.example apps/api/.env
```

Open `apps/api/.env` and set `JWT_SECRET` to a random string of at least 32 characters. To generate one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then create and seed the database, and start both apps:

```bash
npm run db:migrate -w @courtside/api
npm run db:seed -w @courtside/api
npm run dev
```

| URL                              | What                                       |
| -------------------------------- | ------------------------------------------ |
| http://localhost:5173            | Web app                                    |
| http://localhost:4000/api/health | API health (`{"ok":true,"database":"up"}`) |

In development, Vite proxies `/api` and `/socket.io` to the API, so the browser only talks to `localhost:5173`.

### Seed data

The seed is safe to run more than once. It creates:

- **Rally House, Dink District and Kitchen Line Club**, each with 4 courts. Courts cost ₱400 an hour before 5 PM and ₱500 after.
- **A venue owner**: `owner@rallyhouse.test`.
- **Eight players**, including `andrea.cruz@player.test`. Every seeded account uses the password `password123`.
- **A live open play session at Rally House** that started an hour before the seed ran, with all 8 players checked in and queued. There are also upcoming sessions tomorrow at each venue.

Open play sessions are only seeded once. Run `npm run db:reset -w @courtside/api` to start again from an empty database. It drops all data, re-applies the migrations and re-runs the seed.

## Environment variables

### API (`apps/api/.env`)

| Variable          | Default                 | Notes                                                                                               |
| ----------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`    | —                       | Required. Connection the API uses. On Supabase: transaction pooler, port 6543, `?pgbouncer=true`    |
| `DIRECT_URL`      | —                       | Required by Prisma Migrate. On Supabase: session pooler, port 5432. Locally: same as `DATABASE_URL` |
| `JWT_SECRET`      | —                       | Required, 32+ characters                                                                            |
| `JWT_EXPIRES_IN`  | `7d`                    | Any [vercel/ms](https://github.com/vercel/ms) duration                                              |
| `PORT`            | `4000`                  |                                                                                                     |
| `CORS_ORIGIN`     | `http://localhost:5173` | Comma-separated list of allowed origins, or `*`                                                     |
| `LOG_LEVEL`       | `info`                  | `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`                                        |
| `AUTH_RATE_LIMIT` | `20`                    | Sign-in and sign-up attempts per IP per 15 minutes                                                  |
| `NODE_ENV`        | `development`           | `production` switches logs to JSON                                                                  |

### Web (`apps/web/.env`, optional)

| Variable       | Default | Notes                                                                      |
| -------------- | ------- | -------------------------------------------------------------------------- |
| `VITE_API_URL` | empty   | Set only when the API is on another origin, e.g. `https://api.example.com` |

## Everyday tasks

| Task                       | Command                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------ |
| Change the database schema | Edit `schema.prisma`, then `npm run db:migrate -w @courtside/api -- --name <change>` |
| Browse the database        | `npm run db:studio -w @courtside/api`                                                |
| Run one workspace's tests  | `npm test -w @courtside/api` or `-w @courtside/web`                                  |
| Watch tests while coding   | `npm run test:watch -w @courtside/web`                                               |
| Fix formatting             | `npm run format`                                                                     |

## Troubleshooting

- **The API won't start and says `JWT_SECRET must be at least 32 characters`.** Set it in `apps/api/.env`.
- **`/api/health` returns `503` with `"database":"down"`.** Postgres isn't reachable. Run `npm run db:up` and check `DATABASE_URL`.
- **Port 5432 is already in use.** Another Postgres is running. Stop it, or change the port mapping in `docker-compose.yml` and in `DATABASE_URL` to match.
- **Prisma says the client isn't generated.** Run `npx prisma generate --schema apps/api/prisma/schema.prisma`.
- **npm warns about install scripts.** The root `package.json` lists the packages allowed to run install scripts (`allowScripts`): Prisma and esbuild. When a dependency update changes one of those versions, approve it again with `npm approve-scripts <package>`.
