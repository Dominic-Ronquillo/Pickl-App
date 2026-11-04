# Roadmap

## Decisions still open

These need a product decision before they can be built.

| Topic           | Question                                                                                                              | Where it plugs in                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Online payments | Which provider for GCash, Maya and card? Bookings would be created `PENDING` and confirmed by the provider's webhook. | `bookings.service.ts`, `Payment.providerRef` |
| Refund policy   | What gets refunded when a player or venue cancels, and up to when?                                                    | `TODO` in `bookings.service.ts`              |
| Rating updates  | Which formula after each game (Elo-style, DUPR-like)?                                                                 | `TODO` in `games.service.ts` (`endGame`)     |
| Queue settings  | Should each venue set its own 4-on/4-off threshold and streak cap?                                                    | `RotationConfig` in `queue/rotation.ts`      |
| Supabase Auth   | Keep the API's own accounts, or move sign-in to Supabase Auth (adds Google and Apple sign-in, magic links)?           | `auth.routes.ts`, `middleware/auth.ts`       |

## Next work

**Venue app**

- Schedule: the court × hour grid with walk-ins and maintenance blocks. The API endpoints already exist.
- Open play management: create sessions, check players in, start games from the queue, keep score.
- Bookings list: upcoming, unpaid and cancelled, with a mark-paid action.
- Settings: courts and pricing.

**Player app**

- Password reset (`/auth/forgot-password` is stubbed and needs token storage and an email provider).
- Register a venue from the profile (`POST /me/venues`).
- A "You're up on Court 2" notification from the `queue:your-turn` event, with browser push when the tab is closed.

**Platform**

- **Upgrade Zod 3 to 4.** `npm audit` reports a high-severity advisory in Zod 3.x (memory exhaustion on oversized collections, GHSA-mrhx-c7xc-m3w5). The API's 100 KB body limit reduces the exposure. The upgrade changes every validator, so it gets its own branch.
- **Store the token in an httpOnly cookie.** Both apps currently keep the JWT in `localStorage`. A cookie set by the API would keep it out of reach of scripts.
- **Integration tests against Postgres.** CI already provides Postgres 16. Add service-level tests for booking conflicts, capacity and queue flows.
- **Socket.IO Redis adapter**, so the API can run on more than one instance.
- **Staff invites by email.**
- **Venue sign-up in the venue app** (`POST /auth/register-venue`). Today a venue is added with the seed or `POST /me/venues`.
- **One sign-in across both apps.** Each app signs in separately today. An httpOnly cookie on the parent domain (for example `.courtside.ph`) would let owners move between the apps without signing in again.
- **React Router 8.** The project is pinned to 7.x on purpose; upgrade once 8's migration notes have been reviewed.
