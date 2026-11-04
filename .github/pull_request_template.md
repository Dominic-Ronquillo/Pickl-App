## What and why

<!-- What does this change, and what problem does it solve? Link the issue if there is one. -->

## How to check it

<!-- Steps a reviewer can follow. Add phone and desktop screenshots for UI changes. -->

## Checklist

- [ ] `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build` pass locally
- [ ] Tests cover new rules and fixes
- [ ] Schema changes include a migration, and new tables enable Row Level Security
- [ ] Docs updated (endpoints, environment variables, behavior)
- [ ] Targets the right branch: `be-*` → `be-main`, `fe-*` → `fe-main`, `be-main`/`fe-main` → `develop` (never `main`)
