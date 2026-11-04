# Courtside

Courtside is a pickleball web app with a **player side** and a **venue side**.

- **Players** book courts by the hour, join open play sessions for their skill level, and follow live lineups with their place in the queue.
- **Venues** see revenue and court use at a glance, run open play, check players in and keep score.

Prices are in Philippine pesos, and each venue has its own time zone (the default is `Asia/Manila`).

## Tech stack

| Layer          | Choice                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------ |
| Runtime        | Node.js 22 LTS (works on 20.19+), npm workspaces                                                 |
| Backend        | Express 4, TypeScript, Prisma 5, PostgreSQL 16, Socket.IO 4, Zod, JWT, pino                      |
| Frontend       | React 19, Vite 8, TypeScript, React Router 7, TanStack Query 5, Tailwind CSS 4, socket.io-client |
| Testing        | Vitest, Supertest (API), Testing Library (web)                                                   |
| Quality        | ESLint 9 (typescript-eslint, react-hooks), Prettier, GitHub Actions CI                           |
| Infrastructure | Docker Compose for local Postgres, multi-stage Dockerfile for the API                            |

## Quick start

Prerequisites: Node.js 22 (`nvm use`) and Docker.

```bash
npm install
npm run db:up                                  # Postgres 16 on :5432
cp apps/api/.env.example apps/api/.env         # then set JWT_SECRET (32+ characters)
npm run db:migrate -w @courtside/api           # tables + no-double-booking constraints
npm run db:seed -w @courtside/api              # 3 venues, 8 players, a live open play session
npm run dev                                    # API on :4000, web on http://localhost:5173
```

You can sign in with the seeded accounts. Both use the password `password123`:

- Player: `andrea.cruz@player.test`
- Venue owner: `owner@rallyhouse.test`

For environment variables and troubleshooting, see [docs/getting-started.md](docs/getting-started.md).

## Repository layout

```
apps/
  api/          REST + Socket.IO backend (Express, Prisma)      → apps/api/README.md
  web/          React web app (Vite)                            → apps/web/README.md
design/
  prototype.html  original clickable mobile prototype (visual reference)
docs/           architecture, setup, queue rules, deployment, roadmap
.github/        CI workflow and pull request template
```

## Scripts

You can run these from the repository root:

| Command                               | What it does                                    |
| ------------------------------------- | ----------------------------------------------- |
| `npm run dev`                         | API and web together, with reload on save       |
| `npm run dev:api` / `npm run dev:web` | One side only                                   |
| `npm test`                            | Every workspace's tests                         |
| `npm run lint` / `npm run typecheck`  | ESLint over the repo / TypeScript per workspace |
| `npm run format` / `format:check`     | Prettier                                        |
| `npm run build`                       | Production builds of API and web                |
| `npm run db:up` / `npm run db:down`   | Start or stop local Postgres                    |

## Documentation

- [Getting started](docs/getting-started.md): setup, environment variables, everyday tasks
- [Architecture](docs/architecture.md): how the pieces fit, conventions, data flow
- [API reference](apps/api/README.md): every endpoint, data model, real-time events
- [Web app](apps/web/README.md): structure and how to add a page
- [Open play queue rules](docs/queue-rules.md): the rotation and where the rules came from
- [Deployment](docs/deployment.md): Docker image, static web build, migrations
- [Roadmap](docs/roadmap.md): open decisions and next work
- [Contributing](CONTRIBUTING.md): branches, commits, pull requests
