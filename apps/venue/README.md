# Courtside for venues

The web app for venue owners, managers and front-desk staff. It's built the same way as the [player app](../player/README.md), on the shared `@courtside/client` and `@courtside/ui` packages, and uses the court-blue header from the prototype.

```bash
npm run dev -w @courtside/venue        # http://localhost:5174 (expects the API on :4000)
npm test -w @courtside/venue
npm run build -w @courtside/venue      # → dist/
```

Demo login: `owner@rallyhouse.test`, password `password123`. Player-only accounts are refused with "This account doesn't manage a venue."

## Structure

```
src/
  main.tsx               entry: <Providers side="venue"> + router
  app/                   router, RouteFallbacks
  components/AppShell    navigation + link to the player app
  features/
    auth/                venue sign-in
    dashboard/           revenue, court use, bookings, check-ins, courts right now
  styles/index.css       Tailwind + the shared Courtside theme
```

## Pages

| Path     | What                                                              |
| -------- | ----------------------------------------------------------------- |
| `/login` | Sign in as venue staff                                            |
| `/`      | Today's dashboard for the selected venue (refreshes every minute) |

## What's next

The API already supports everything below. Each item is a `fe-venue-<topic>` branch:

| Page      | API (`/business/venues/:venueId/...`)                                                    |
| --------- | ---------------------------------------------------------------------------------------- |
| Schedule  | `GET /schedule`, `POST /blocks`, `DELETE /blocks/:id`, `POST /bookings` (walk-ins)       |
| Bookings  | `GET /bookings?filter=upcoming\|unpaid\|cancelled`, `POST /bookings/:id/paid`, `/cancel` |
| Open play | sessions, roster, check-ins, `POST .../games` (next group from the queue), scores        |
| Settings  | `PATCH /courts/:courtId`, `PUT /pricing` (owners and managers)                           |

Venue staff routes need a staff role at that venue, and the settings routes need an owner or manager. The API enforces this; the app only hides what a role can't use.

Adding a page works the same way as in the [player app](../player/README.md#adding-a-page).
