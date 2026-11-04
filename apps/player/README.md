# Courtside player app

The web app for players: booking courts, open play and live lineups. **Stack:** React 19, Vite 8, TypeScript, React Router 7, TanStack Query 5 and Tailwind CSS 4. Shared code comes from `@courtside/client` and `@courtside/ui`. Tests use Vitest and Testing Library.

```bash
npm run dev -w @courtside/player       # http://localhost:5173 (expects the API on :4000)
npm test -w @courtside/player
npm run build -w @courtside/player     # → dist/
```

## Structure

```
src/
  main.tsx               entry: <Providers side="player"> + router
  app/                   router, RouteFallbacks
  components/AppShell    navigation (Home, Open play, Book) + link to the venue app for owners
  features/
    auth/                sign in, player sign-up
    home/                next booking, stats, joined sessions, recent games
    booking/             court booking grid (slots.ts: which hours a booking covers)
    openplay/            session list, session detail (live courts + queue), queue rules
  styles/index.css       Tailwind + the shared Courtside theme
```

## Pages

| Path                  | What                                                             |
| --------------------- | ---------------------------------------------------------------- |
| `/login`, `/register` | Sign in; player sign-up                                          |
| `/`                   | Next booking, stats, joined sessions, recent games               |
| `/book`               | Venue, date and duration pickers; court × hour grid; my bookings |
| `/open-play`          | Sessions by skill level                                          |
| `/open-play/:id`      | Join or leave; live courts, up next, my place in line            |
| `/open-play/rules`    | How the queue works                                              |

## Adding a page

1. Create `src/features/<area>/<Name>Page.tsx`.
2. Load data with `useQuery({ queryKey: [...], queryFn: () => api<T>('/path') })`, using `api` from `@courtside/client/api`. Name keys after the API path, so related mutations can invalidate them.
3. Add response types to `packages/client/src/types.ts`.
4. Register the route in `src/app/router.tsx`. Routes inside `<AppShell />` get the navigation.
5. Add a nav entry in `components/AppShell.tsx` if the page needs one.

If the venue app needs the same thing, put it in `packages/client` (logic) or `packages/ui` (components) rather than copying it.

## Conventions

- Show API errors with `<ErrorState error={...} />` or `errorMessage(err)`. The API's messages are written for users.
- Format money with `peso(cents)` and times with `timeOfDay(iso, venueTz)` from `@courtside/client/format`. Never format them by hand.
- Use the design tokens (`bg-court`, `text-ink-2`, `border-line`, `bg-ball`...), not raw hex values, so dark mode keeps working.
- Interactive elements need an accessible name. Tests query by role and label, the same way assistive tech does.
