# Contributing

## Branches

```
main                     production; only receives merges from develop
└── develop              integration; what the next release will contain
    ├── be-main          backend line of work (apps/api)
    │   └── be-<topic>   backend features and fixes, e.g. be-open-play-queue
    ├── fe-main          frontend line of work (apps/web)
    │   └── fe-<topic>   frontend features and fixes, e.g. fe-venue-schedule
    ├── docs/<topic>     documentation only
    └── chore/<topic>    tooling, CI, dependencies
```

- Branch backend work from `be-main` and frontend work from `fe-main`. Open the pull request back into the same branch.
- Merge `be-main` and `fe-main` into `develop` once their work is green and reviewed.
- Merge `develop` into `main` to release. Tag releases `vX.Y.Z`.
- Merge `develop` back into `be-main` and `fe-main` regularly, so each side picks up the other's changes.
- If a change touches both apps (for example, a new endpoint and the screen that uses it), land the API part on `be-main` first, then the web part on `fe-main`.
- Use merge commits (`--no-ff`) into the long-lived branches, so the history shows what each feature brought in.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) with a scope:

```
feat(api): add staff invites
fix(web): keep the selected slot after refetch
docs: explain the queue rotation
chore: bump Prisma to 5.23
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `build`, `chore`. Scopes: `api`, `web`, or none for repo-wide changes. Keep each commit to one logical change.

## Pull requests

Before you open one:

```bash
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
```

CI runs the same steps against Postgres 16. A pull request needs:

- A description of what changed and why. Add screenshots for UI changes, at both phone and desktop width.
- Tests for new rules and fixes. Keep business rules in pure functions or services, so they're testable without HTTP.
- A migration if `schema.prisma` changed: `npm run db:migrate -w @courtside/api -- --name <what>`. Commit the generated folder.
- Updated docs when behavior, endpoints or environment variables change.

## Code conventions

- **API:** HTTP concerns go in `*.routes.ts` and rules in `*.service.ts`. Validate input with Zod through the `validate` middleware. Throw `HttpError` with a user-facing message and a stable `code`.
- **Money:** store and send integer centavos. Format only at the edge (`peso()` in the web app).
- **Time:** store UTC. Use the venue's time zone for hours, pricing and "today" (`lib/time.ts` in the API, `lib/format.ts` in the web app).
- **Web:** fetch server data with TanStack Query and the `api()` client. Don't copy server data into component state. Feature code lives in `src/features/<area>/`, and shared pieces in `src/components/`.
- **Style:** Prettier formats everything. Name things for what they mean to players and venues ("court", "session", "check-in").
