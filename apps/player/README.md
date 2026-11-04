# Courtside web

The React web app for players and venues. **Stack:** React 19, Vite 8, TypeScript, React Router 7, TanStack Query 5, Tailwind CSS 4, socket.io-client. Tests use Vitest and Testing Library.

```bash
npm run dev -w @courtside/web        # http://localhost:5173 (expects the API on :4000)
npm test -w @courtside/web
npm run build -w @courtside/web      # → dist/
```

## Structure

```
src/
  main.tsx               entry: providers + router
  app/                   Providers, queryClient, router, RouteFallbacks
  lib/
    api.ts               fetch client, ApiError, token storage
    format.ts            pesos, venue-local times, date strip
    realtime.ts          Socket.IO connection + useSessionLive
  types/api.ts           API response shapes
  components/            AppShell (navigation), ui.tsx (UI kit), CourtDiagram
  features/
    auth/                sign in, register, AuthProvider, RequireAuth
    home/                player home
    booking/             court booking grid
    openplay/            session list, session detail (live courts + queue), queue rules
    venue/               venue dashboard
  styles/index.css       Tailwind theme with the Courtside tokens
```

## Pages

| Path                  | Who    | What                                                             |
| --------------------- | ------ | ---------------------------------------------------------------- |
| `/login`, `/register` | anyone | Sign in as a player or venue owner; player sign-up               |
| `/`                   | player | Next booking, stats, joined sessions, recent games               |
| `/book`               | player | Venue, date and duration pickers; court × hour grid; my bookings |
| `/open-play`          | player | Sessions by skill level                                          |
| `/open-play/:id`      | player | Join or leave; live courts, up next, my place in line            |
| `/open-play/rules`    | player | How the queue works                                              |
| `/venue`              | staff  | Revenue, court use, check-ins, courts right now                  |

## Adding a page

1. Create `src/features/<area>/<Name>Page.tsx`.
2. Load data with `useQuery({ queryKey: [...], queryFn: () => api<T>('/path') })`. Name keys after the API path, so related mutations can invalidate them.
3. Add response types to `src/types/api.ts`.
4. Register the route in `src/app/router.tsx`. Routes inside `<AppShell />` get the navigation, and `<RequireAuth venue />` limits them to staff.
5. Add a nav entry in `components/AppShell.tsx` if the page needs one.

## Conventions

- Show API errors with `<ErrorState error={...} />` or `errorMessage(err)`. The API's messages are written for users.
- Format money with `peso(cents)` and times with `timeOfDay(iso, venueTz)`. Never format them by hand.
- Use the design tokens (`bg-court`, `text-ink-2`, `border-line`, `bg-ball`...), not raw hex values, so dark mode keeps working.
- Interactive elements need an accessible name. Tests query by role and label, the same way assistive tech does.
