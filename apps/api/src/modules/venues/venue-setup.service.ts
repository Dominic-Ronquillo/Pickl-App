import type { Prisma } from '@prisma/client';
import { z } from 'zod';

/** Venue details collected at sign-up (step 2 of venue registration). */
export const venueSetupSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    address: z.string().trim().min(3).max(200),
    courts: z.number().int().min(1).max(30),
    opensAtMinute: z.number().int().min(0).max(1439).default(360),
    closesAtMinute: z.number().int().min(1).max(1440).default(1320),
    offPeakCentsPerHour: z.number().int().min(0),
    peakCentsPerHour: z.number().int().min(0),
    peakStartsAtMinute: z.number().int().min(0).max(1440).default(1020), // 5 PM
  })
  .refine((v) => v.closesAtMinute > v.opensAtMinute, {
    message: 'Closing time must be after opening time',
    path: ['closesAtMinute'],
  });

export type VenueSetup = z.infer<typeof venueSetupSchema>;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .slice(0, 50) || 'venue';

/** Creates a venue with its courts and price bands, and makes `ownerId` its OWNER. Runs inside the caller's transaction. */
export async function createVenueForOwner(tx: Prisma.TransactionClient, ownerId: string, v: VenueSetup) {
  const peakStart = Math.min(Math.max(v.peakStartsAtMinute, v.opensAtMinute), v.closesAtMinute);
  const pricing = [
    { startMinute: v.opensAtMinute, endMinute: peakStart, centsPerHour: v.offPeakCentsPerHour },
    { startMinute: peakStart, endMinute: v.closesAtMinute, centsPerHour: v.peakCentsPerHour },
  ].filter((r) => r.endMinute > r.startMinute);

  return tx.venue.create({
    data: {
      name: v.name,
      slug: `${slugify(v.name)}-${Math.random().toString(36).slice(2, 7)}`,
      address: v.address,
      opensAtMinute: v.opensAtMinute,
      closesAtMinute: v.closesAtMinute,
      courts: { create: Array.from({ length: v.courts }, (_, i) => ({ number: i + 1, name: `Court ${i + 1}` })) },
      pricingRules: { create: pricing },
      staff: { create: { userId: ownerId, role: 'OWNER' } },
    },
    select: { id: true, name: true, slug: true },
  });
}
