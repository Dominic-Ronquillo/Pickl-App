import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, HttpError } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { signToken } from '../../middleware/auth.js';
import { createVenueForOwner, venueSetupSchema } from '../venues/venue-setup.service.js';

export const authRouter = Router();

const SKILL_RATING = { BEGINNER: 2.5, INTERMEDIATE: 3.5, ADVANCED: 4.25 } as const;
const phone = z.string().trim().regex(/^[+\d][\d\s-]{6,19}$/, 'Enter a valid mobile number');
const accountFields = {
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8, 'Use at least 8 characters'),
};

async function sessionPayload(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, rating: true, staffRoles: { select: { role: true, venue: { select: { id: true, name: true } } } } },
  });
  const { staffRoles, ...rest } = user;
  return {
    token: signToken(user.id),
    user: rest,
    // The app shows the venue side only when this list isn't empty.
    venues: staffRoles.map((s) => ({ id: s.venue.id, name: s.venue.name, role: s.role })),
  };
}

// ---------- Player sign-up ----------

const registerBody = z.object({
  ...accountFields,
  phone: phone.optional(),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('INTERMEDIATE'),
});

authRouter.post(
  '/register',
  validate({ body: registerBody }),
  asyncHandler(async (req, res) => {
    const { name, email, phone, password, skillLevel } = req.body as z.infer<typeof registerBody>;
    if (await prisma.user.findUnique({ where: { email } })) {
      throw new HttpError(409, 'An account with this email already exists. Sign in instead.', 'EMAIL_TAKEN');
    }
    const user = await prisma.user.create({
      data: { name, email, phone, rating: SKILL_RATING[skillLevel], passwordHash: await bcrypt.hash(password, 12) },
    });
    res.status(201).json(await sessionPayload(user.id));
  }),
);

// ---------- Venue owner sign-up: owner account + venue in one transaction ----------

const registerVenueBody = z.object({ ...accountFields, phone, venue: venueSetupSchema });

authRouter.post(
  '/register-venue',
  validate({ body: registerVenueBody }),
  asyncHandler(async (req, res) => {
    const { name, email, phone, password, venue } = req.body as z.infer<typeof registerVenueBody>;
    if (await prisma.user.findUnique({ where: { email } })) {
      throw new HttpError(409, 'An account with this email already exists. Sign in, then register your venue from your profile.', 'EMAIL_TAKEN');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name, email, phone, passwordHash } });
      await createVenueForOwner(tx, user.id, venue);
      return user.id;
    });
    res.status(201).json(await sessionPayload(userId));
  }),
);

// ---------- Sign in (player or venue owner) ----------

const loginBody = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
  as: z.enum(['player', 'venue']).default('player'),
});

authRouter.post(
  '/login',
  validate({ body: loginBody }),
  asyncHandler(async (req, res) => {
    const { email, password, as } = req.body as z.infer<typeof loginBody>;
    const user = await prisma.user.findUnique({ where: { email }, include: { staffRoles: true } });
    // Same message for unknown email and wrong password, so accounts can't be discovered.
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, 'Email or password is incorrect.', 'BAD_CREDENTIALS');
    }
    if (as === 'venue' && user.staffRoles.length === 0) {
      throw new HttpError(403, 'This account doesn’t manage a venue. Sign in as a player, then register your venue from your profile.', 'NOT_VENUE_STAFF');
    }
    res.json({ ...(await sessionPayload(user.id)), mode: as });
  }),
);

// ---------- Password reset ----------

authRouter.post(
  '/forgot-password',
  validate({ body: z.object({ email: z.string().trim().email().toLowerCase() }) }),
  asyncHandler(async (_req, res) => {
    // TODO: create a single-use token (hashed, 30-minute expiry) and email the reset link.
    // Always 202 so the response doesn't reveal whether the email has an account.
    res.status(202).json({ ok: true });
  }),
);
