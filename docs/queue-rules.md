# Open play queue rules

Open play at most venues runs on a **paddle stack**. Players put their paddles in a rack in arrival order, and the next game is formed from the front of the line. Courtside implements the most common version of that rotation.

## The rules

1. **Check in to join the line.** A player enters the queue when staff check them in. Earlier check-in means an earlier game.
2. **2 on / 2 off while the line is short.** After a game, the winning pair stays on the court and splits up. Each winner partners with one of the next two players in line. The losing pair goes to the back.
3. **Two games in a row at most.** A player who has just played 2 consecutive games comes off, even after a win. Their partner stays if it was only the partner's first game.
4. **4 on / 4 off when it's busy.** When **8 or more** players are waiting, all four players come off after every game, so the line moves faster.
5. **Paddle order.** Players coming off go to the back in this order: the losers first, then any winners who hit the 2-game cap.
6. **Ties or no score.** If a game ends level (for example, it was abandoned at 0–0), nobody stays on and all four go to the back.
7. **Leaving.** A player who leaves the session, or has their check-in undone, loses their place. Checking in again puts them at the back.
8. **Staff can override.** Staff can always start a game with four players of their choosing. Winners who were being held for that court go back to the front of the line.

## Settings

The defaults live in `DEFAULT_ROTATION` in `apps/api/src/modules/queue/rotation.ts`:

| Setting               | Default | Meaning                                                  |
| --------------------- | ------- | -------------------------------------------------------- |
| `fourOffThreshold`    | `8`     | Waiting players at which every game becomes 4 on / 4 off |
| `maxConsecutiveGames` | `2`     | Most games a player can play in a row                    |
| `avgGameMinutes`      | `15`    | Used only for the "~15 min" wait estimate                |

Venues set different thresholds, from 6 to 10 waiting players, so making these per-venue settings is on the [roadmap](roadmap.md).

## Where it lives in the code

| Piece                                   | Responsibility                                                          |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `modules/queue/rotation.ts`             | The rules above as pure functions, unit-tested in `rotation.test.ts`    |
| `modules/queue/queue.service.ts`        | Stores each player's state in `QueueEntry` and applies the rules        |
| `QueueEntry.status`                     | `WAITING` (in line), `HOLDING` (winner staying on `courtId`), `PLAYING` |
| `GET /open-play/sessions/:id/queue`     | Waiting players in order, with an estimated wait                        |
| `GET /open-play/sessions/:id/lineups`   | Courts, live games and the "Up next" groups                             |
| `POST /business/.../sessions/:id/games` | `{ courtId }` with no teams starts the next group from the queue        |

The wait estimate matches "Up next". Players already in a next group show 0 minutes. Everyone else waits one game length per rotation, where a rotation frees 2 spots per court, or 4 spots per court when the 4 on / 4 off rule is active.

## Sources

These rules follow the posted open play rules of several US parks departments and clubs. The details vary by venue; these are the most common choices.

- [Drake open play rotation rules](https://wbparks.org/wp-content/uploads/2023/01/2024-Drake-Open-Play-Pickleball-Rotation-Rules-1.pdf): 2 on / 2 off up to 6 waiting, 4 on / 4 off from 7
- [Carson City pickleball rules](https://www.carsoncity.gov/home/showpublisheddocument/92480/638990649464800000): 4 on / 4 off once 10 or more paddles are queued
- [Sandy Springs open play rules](https://sandyspringsga.gov/pickleball-open-play-rules): all four players come off after each game
- [Clark County challenge court rules](https://www.clarkcountynv.gov/assets/documents/government/departments/parks___recreation/sports/pickleball/ccpr-pickleball-challenge-court-rules.pdf)
- [Vista pickleball](https://vista.gov/departments/recreation-comm-services/pickleball): winners stay as long as they win on challenge courts
- [The Dink: paddle queuing and rotation methods](https://www.thedinkpickleball.com/the-best-paddle-queuing-and-rotation-methods-for-open-play-pickleball/)
