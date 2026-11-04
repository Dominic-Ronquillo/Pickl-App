/** Response shapes from apps/api. Dates arrive as ISO strings; money as integer centavos. */

export type SkillLevel = 'ALL' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type StaffRole = 'OWNER' | 'MANAGER' | 'STAFF';
/** Which web app: the player app or the venue app. */
export type Side = 'player' | 'venue';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  rating: string; // Prisma Decimal serialises as a string
}

export interface StaffVenue {
  id: string;
  name: string;
  role: StaffRole;
}

export interface SessionPayload {
  token: string;
  user: User;
  venues: StaffVenue[];
  mode?: Side;
}

export interface Venue {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  courtCount: number;
}

export type SlotStatus = 'OPEN' | 'BOOKED' | 'MINE' | 'BLOCKED' | 'OPEN_PLAY' | 'PAST';

export interface Availability {
  venue: { id: string; name: string; timezone: string };
  date: string;
  courts: { id: string; number: number; name: string }[];
  slots: { courtId: string; startsAt: string; endsAt: string; status: SlotStatus; priceCents: number | null }[];
}

export interface Booking {
  id: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  totalCents: number;
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  court: { number: number; name: string };
  venue: { id: string; name: string };
}

export interface Stats {
  gamesTotal: number;
  gamesThisMonth: number;
  winRate: number | null;
}

export interface Person {
  id: string;
  name: string;
}

export interface RecentGame {
  id: string;
  endedAt: string;
  won: boolean;
  score: string;
  partners: Person[];
  opponents: Person[];
}

export type RegistrationStatus = 'JOINED' | 'CHECKED_IN';

export interface SessionSummary {
  id: string;
  title: string | null;
  startsAt: string;
  endsAt: string;
  skillLevel: SkillLevel;
  capacity: number;
  feeCents: number;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
  venue: { id: string; name: string };
  courtCount: number;
  playerCount: number;
  spotsLeft: number;
  myStatus: RegistrationStatus | null;
}

export interface SessionDetail extends Omit<SessionSummary, 'courtCount' | 'venue'> {
  venue: { id: string; name: string; address: string | null };
  courts: { id: string; number: number; name: string }[];
  players: (Person & { rating: string; checkedIn: boolean })[];
}

export interface QueueEntry {
  userId: string;
  name: string;
  position: number;
  joinedAt: string;
  estimatedWaitMinutes: number | null;
}

export interface Lineups {
  session: { id: string; status: SessionSummary['status']; startsAt: string; endsAt: string };
  courts: {
    id: string;
    number: number;
    name: string;
    game?: { id: string; sequence: number; scoreA: number; scoreB: number; teamA: Person[]; teamB: Person[] };
  }[];
  upNext: { teamA: Person[]; teamB: Person[] }[];
  queueReady: boolean;
}

export interface Dashboard {
  date: string;
  revenueCents: number;
  hourlyRevenue: { hour: number; cents: number }[];
  courtUsePercent: number;
  bookingCount: number;
  checkInCount: number;
  courtsNow: {
    courtId: string;
    number: number;
    status: 'FREE' | 'BOOKED' | 'OPEN_PLAY' | 'BLOCKED';
    booking: { id: string; name: string | null; endsAt: string } | null;
  }[];
}
