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

  const players = ['Andrea Cruz', 'Miguel Santos', 'Bea Reyes', 'Paolo Lim', 'Carla Tan', 'Jun Dizon', 'Nina Garcia', 'Rico Bautista'];
  for (const name of players) {
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}@player.test`;
    await prisma.user.upsert({ where: { email }, update: {}, create: { email, name, passwordHash, rating: 3.5 } });
  }

  console.log('Seeded. Sign in as owner@rallyhouse.test or andrea.cruz@player.test with password123');
}

main().finally(() => prisma.$disconnect());
