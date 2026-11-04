# Shared packages

Code that both web apps (`apps/player`, `apps/venue`) use. The packages are consumed as TypeScript source through npm workspaces, so there's no build or publish step: Vite compiles them as part of each app.

| Package             | Import paths                                                             | What                                                                    |
| ------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `@courtside/client` | `/api`, `/auth`, `/format`, `/providers`, `/realtime`, `/types`, `/apps` | API client, sign-in, formatting, live updates, response types, app URLs |
| `@courtside/ui`     | `@courtside/ui`, `@courtside/ui/theme.css`                               | Tailwind theme, UI kit, AppShell, SignInForm, AuthLayout, CourtDiagram  |

Rules:

- Packages never import from an app. Apps may import from packages.
- `@courtside/ui` may use `@courtside/client`, but not the other way round.
- Each app's CSS must `@source` the `packages/ui/src` folder, so Tailwind generates the shared components' classes.
- Tests for shared logic live next to it (`packages/client/src/*.test.ts`) and run with `npm test -w @courtside/client`.
