# Courtside

> **This branch is the project overview.** The code lives on [`develop`](https://github.com/Dominic-Ronquillo/Pickl-App/tree/develop) (latest working version), with backend work on [`be-main`](https://github.com/Dominic-Ronquillo/Pickl-App/tree/be-main) and frontend work on [`fe-main`](https://github.com/Dominic-Ronquillo/Pickl-App/tree/fe-main). To get started:
>
> ```bash
> git clone -b develop https://github.com/Dominic-Ronquillo/Pickl-App.git
> ```
>
> Open pull requests against `develop`, `be-main` or `fe-main`, never `main`. See [CONTRIBUTING.md](CONTRIBUTING.md).

Courtside is a pickleball platform with two web apps: one for **players** and one for **venues**.

- **Players** book courts by the hour, join open play sessions for their skill level, and follow live lineups with their place in the queue.
- **Venues** see revenue and court use at a glance, run open play, check players in and keep score.

Prices are in Philippine pesos, and each venue has its own time zone (the default is `Asia/Manila`).

## Tech stack

| Layer          | Choice                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime        | Node.js 22 LTS (works on 20.19+), npm workspaces                                                                                                              |
| Backend        | Express 4, TypeScript, Prisma 5, Socket.IO 4, Zod, JWT, pino                                                                                                  |
| Database       | PostgreSQL on **Supabase** (hosted); PostgreSQL 16 in Docker for local development and CI                                                                     |
| Frontend       | Two apps (player, venue): React 19, Vite 8, TypeScript, React Router 7, TanStack Query 5, Tailwind CSS 4, socket.io-client; shared code in workspace packages |
| Testing        | Vitest, Supertest (API), Testing Library (web)                                                                                                                |
| Quality        | ESLint 9 (typescript-eslint, react-hooks), Prettier, GitHub Actions CI                                                                                        |
| Infrastructure | Docker Compose for local Postgres, multi-stage Dockerfile for the API                                                                                         |

## Quick start

Prerequisites: Node.js 22 (`nvm use`) and Docker. Local development uses Postgres in Docker. Hosted environments use Supabase (see [docs/deployment.md](docs/deployment.md#database-supabase)).

```bash
npm install
npm run db:up                                  # Postgres 16 on :5432
cp apps/api/.env.example apps/api/.env         # then set JWT_SECRET (32+ characters)
npm run db:migrate -w @courtside/api           # tables + no-double-booking constraints
npm run db:seed -w @courtside/api              # 3 venues, 8 players, a live open play session
npm run dev                                    # API :4000, player app :5173, venue app :5174
```

You can sign in with the seeded accounts. Both use the password `password123`:

- Player: `andrea.cruz@player.test`
- Venue owner: `owner@rallyhouse.test`

For environment variables and troubleshooting, see [docs/getting-started.md](docs/getting-started.md).

## Repository layout

```
apps/
  api/          REST + Socket.IO backend (Express, Prisma)      → apps/api/README.md
  player/       player web app (React, Vite), :5173             → apps/player/README.md
  venue/        venue web app for owners and staff, :5174       → apps/venue/README.md
packages/
  client/       shared API client, sign-in, formatting, live updates, types
  ui/           shared design system: theme, components, app shell, court diagram
design/
  prototype.html  original clickable mobile prototype (visual reference)
Courtside_pickleball_app.html  latest prototype revision (also on this branch)
docs/           architecture, setup, queue rules, deployment, roadmap
.github/        CI workflow and pull request template
```

## Scripts

You can run these from the repository root:

| Command                                        | What it does                                    |
| ---------------------------------------------- | ----------------------------------------------- |
| `npm run dev`                                  | API and web together, with reload on save       |
| `npm run dev:api` / `dev:player` / `dev:venue` | One app only                                    |
| `npm test`                                     | Every workspace's tests                         |
| `npm run lint` / `npm run typecheck`           | ESLint over the repo / TypeScript per workspace |
| `npm run format` / `format:check`              | Prettier                                        |
| `npm run build`                                | Production builds of API and web                |
| `npm run db:up` / `npm run db:down`            | Start or stop local Postgres                    |

## Documentation

- [Getting started](docs/getting-started.md): setup, environment variables, everyday tasks
- [Architecture](docs/architecture.md): how the pieces fit, conventions, data flow
- [API reference](https://github.com/Dominic-Ronquillo/Pickl-App/blob/develop/apps/api/README.md): every endpoint, data model, real-time events
- [Player app](https://github.com/Dominic-Ronquillo/Pickl-App/blob/develop/apps/player/README.md) and [venue app](https://github.com/Dominic-Ronquillo/Pickl-App/blob/develop/apps/venue/README.md): structure and how to add a page
- [Open play queue rules](docs/queue-rules.md): the rotation and where the rules came from
- [Deployment](docs/deployment.md): Supabase setup, Docker image, static web build, migrations
- [Roadmap](docs/roadmap.md): open decisions and next work
- [Contributing](CONTRIBUTING.md): branches, commits, pull requests
