import type { Person } from '@/types/api';
import { initials } from '@/lib/format';

const TEAM_A = '#F2D43B';
const TEAM_B = '#FFFFFF';

/**
 * Top-down pickleball court with the four players on it: team A on the left half, team B on the right.
 * Proportions follow a real court (44 × 20 ft, 7 ft kitchen each side of the net).
 */
export function CourtDiagram({ teamA = [], teamB = [], label }: { teamA?: Person[]; teamB?: Person[]; label: string }) {
  const W = 440;
  const H = 200;
  const kitchen = 70;
  const mid = W / 2;
  const spots = (side: 'A' | 'B') => {
    const x = side === 'A' ? mid - kitchen - 70 : mid + kitchen + 70;
    return [
      { x, y: H * 0.28 },
      { x, y: H * 0.72 },
    ];
  };
  const marker = (p: Person | undefined, at: { x: number; y: number }, fill: string, key: string) =>
    p && (
      <g key={key}>
        <circle cx={at.x} cy={at.y} r={20} fill={fill} stroke="#14213D" strokeWidth={2} />
        <text x={at.x} y={at.y + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill="#14213D">
          {initials(p.name)}
        </text>
      </g>
    );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block h-auto w-full rounded-xl">
      <rect width={W} height={H} rx={10} fill="var(--cs-court)" />
      <rect x={mid - kitchen} y={0} width={kitchen * 2} height={H} fill="var(--cs-kitchen)" />
      <g stroke="#fff" strokeWidth={2.5} fill="none">
        <rect x={6} y={6} width={W - 12} height={H - 12} />
        <line x1={6} y1={H / 2} x2={mid - kitchen} y2={H / 2} />
        <line x1={mid + kitchen} y1={H / 2} x2={W - 6} y2={H / 2} />
        <line x1={mid - kitchen} y1={6} x2={mid - kitchen} y2={H - 6} />
        <line x1={mid + kitchen} y1={6} x2={mid + kitchen} y2={H - 6} />
      </g>
      <line x1={mid} y1={0} x2={mid} y2={H} stroke="#fff" strokeWidth={5} strokeDasharray="2 4" />
      {spots('A').map((s, i) => marker(teamA[i], s, TEAM_A, `a${i}`))}
      {spots('B').map((s, i) => marker(teamB[i], s, TEAM_B, `b${i}`))}
    </svg>
  );
}
