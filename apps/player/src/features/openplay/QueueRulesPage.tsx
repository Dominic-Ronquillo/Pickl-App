import { Link } from 'react-router';
import { Card, PageHeader } from '@courtside/ui';

/** Player-facing explanation of the rotation in apps/api/src/modules/queue/rotation.ts. */
export function QueueRulesPage() {
  const rules = [
    [
      'Check in to join the line',
      'Your paddle goes in the stack when the front desk checks you in. Earlier check-in, earlier game.',
    ],
    [
      'Winners stay, losers rotate',
      'After a game, the winning pair stays on court and splits up. Each winner partners with one of the next two players in line. The losing pair goes to the back.',
    ],
    [
      'Two games, then off',
      'No one plays more than 2 games in a row. After your second straight game you go to the back of the line, even if you won.',
    ],
    [
      'Busy nights: 4 on, 4 off',
      'When 8 or more players are waiting, all four players come off after every game so the line moves faster.',
    ],
    ['Leaving', 'If you leave the session, you lose your place. Check in again to rejoin at the back.'],
  ];
  return (
    <>
      <Link to="/open-play" className="text-sm font-semibold text-court-text">
        ← Open play
      </Link>
      <PageHeader
        title="How the queue works"
        subtitle="The paddle-stack rotation used at most pickleball open plays."
      />
      <ol className="mt-4 grid gap-3 md:grid-cols-2">
        {rules.map(([title, body], i) => (
          <li key={title}>
            <Card className="h-full">
              <p className="display text-2xl text-kitchen">{i + 1}</p>
              <h2 className="mt-1 font-bold">{title}</h2>
              <p className="mt-1 text-sm text-ink-2">{body}</p>
            </Card>
          </li>
        ))}
      </ol>
    </>
  );
}
