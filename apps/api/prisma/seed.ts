import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  const venues = [
    { name: 'Rally House', slug: 'rally-house' },
    { name: 'Dink District', slug: 'dink-district' },
    { name: 'Kitchen Line Club', slug: 'kitchen-line-club' },
  ];

  for (const v of venues) {
    await prisma.venue.upsert({
      where: { slug: v.slug },
      update: {},
      create: {
        ...v,
        courts: { create: [1, 2, 3, 4].map((n) => ({ number: n, name: `Court ${n}` })) },
        pricingRules: {
          create: [
            { startMinute: 360, endMinute: 1020, centsPerHour: 40000 }, // ₱400 before 5 PM
            { startMinute: 1020, endMinute: 1320, centsPerHour: 50000 }, // ₱500 from 5 PM
          ],
        },
      },
    });
  }

  const owner = await prisma.user.upsert({
    where: { email: 'owner@rallyhouse.test' },
    update: {},
    create: { email: 'owner@rallyhouse.test', name: 'Rally House Owner', passwordHash },
  });
  const rally = await prisma.venue.findUniqueOrThrow({ where: { slug: 'rally-house' } });
  await prisma.venueStaff.upsert({
    where: { venueId_userId: { venueId: rally.id, userId: owner.id } },
    update: {},
    create: { venueId: rally.id, userId: owner.id, role: 'OWNER' },
  });

  const players = [
    'Andrea Cruz',
    'Miguel Santos',
    'Bea Reyes',
    'Paolo Lim',
    'Carla Tan',
    'Jun Dizon',
    'Nina Garcia',
    'Rico Bautista',
  ];
  for (const name of players) {
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}@player.test`;
    await prisma.user.upsert({ where: { email }, update: {}, create: { email, name, passwordHash, rating: 3.5 } });
  }

  await seedOpenPlay(owner.id);

  console.log('Seeded. Sign in as owner@rallyhouse.test or andrea.cruz@player.test with password123');
}

/**
 * Open play demo data, created once (skipped when sessions already exist):
 * a LIVE session at Rally House started an hour ago with all 8 players checked in and queued,
 * plus upcoming sessions tomorrow at every venue.
 */
async function seedOpenPlay(ownerId: string) {
  if (await prisma.openPlaySession.count()) return;
  const hour = 3600_000;
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const tomorrow = (h: number) => {
    const d = new Date(now.getTime() + 24 * hour);
    d.setUTCHours(h - 8, 0, 0, 0); // venue hours in Asia/Manila (UTC+8)
    return d;
  };
  const players = await prisma.user.findMany({
    where: { email: { endsWith: '@player.test' } },
    orderBy: { email: 'asc' },
  });

  const createSession = async (
    venueSlug: string,
    courtNumbers: number[],
    data: {
      title: string;
      startsAt: Date;
      endsAt: Date;
      skillLevel: 'ALL' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
      status?: 'LIVE';
    },
  ) => {
    const venue = await prisma.venue.findUniqueOrThrow({
      where: { slug: venueSlug },
      include: { courts: { where: { number: { in: courtNumbers } } } },
    });
    return prisma.openPlaySession.create({
      data: {
        ...data,
        venueId: venue.id,
        capacity: 16,
        feeCents: 25000,
        createdById: ownerId,
        courts: { create: venue.courts.map((c) => ({ courtId: c.id })) },
        blocks: {
          create: venue.courts.map((c) => ({
            courtId: c.id,
            startsAt: data.startsAt,
            endsAt: data.endsAt,
            reason: 'OPEN_PLAY' as const,
            createdById: ownerId,
          })),
        },
      },
    });
  };

  const live = await createSession('rally-house', [1, 2], {
    title: 'Morning mixer',
    startsAt: new Date(now.getTime() - hour),
    endsAt: new Date(now.getTime() + 2 * hour),
    skillLevel: 'ALL',
    status: 'LIVE',
  });
  for (const [i, p] of players.entries()) {
    const at = new Date(now.getTime() - hour + i * 60_000);
    await prisma.openPlayRegistration.create({
      data: { sessionId: live.id, userId: p.id, status: 'CHECKED_IN', joinedAt: at, checkedInAt: at },
    });
    await prisma.queueEntry.create({ data: { sessionId: live.id, userId: p.id, enteredAt: at } });
  }

  await createSession('rally-house', [3, 4], {
    title: 'Intermediate open play',
    startsAt: tomorrow(18),
    endsAt: tomorrow(21),
    skillLevel: 'INTERMEDIATE',
  });
  await createSession('dink-district', [1, 2, 3], {
    title: 'Beginner drills + play',
    startsAt: tomorrow(9),
    endsAt: tomorrow(11),
    skillLevel: 'BEGINNER',
  });
  await createSession('kitchen-line-club', [1, 2], {
    title: 'Advanced ladder',
    startsAt: tomorrow(19),
    endsAt: tomorrow(22),
    skillLevel: 'ADVANCED',
  });
}

main().finally(() => prisma.$disconnect());
