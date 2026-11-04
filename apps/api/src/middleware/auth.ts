import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { StaffRole } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, forbidden, HttpError } from '../lib/http.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string };
      staffRole?: StaffRole;
    }
  }
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): string {
  const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
  if (!payload.sub) throw new Error('No subject');
  return payload.sub;
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Sign in required', 'UNAUTHENTICATED');
  try {
    req.user = { id: verifyToken(header.slice(7)) };
  } catch {
    throw new HttpError(401, 'Your session has expired. Sign in again.', 'TOKEN_EXPIRED');
  }
  next();
};

/** Business-side guard: the signed-in user must hold one of `roles` at :venueId. */
export const requireVenueRole = (...roles: StaffRole[]) =>
  asyncHandler(async (req, _res, next) => {
    const staff = await prisma.venueStaff.findUnique({
      where: { venueId_userId: { venueId: req.params.venueId, userId: req.user!.id } },
    });
    if (!staff || !roles.includes(staff.role)) throw forbidden('You don’t manage this venue');
    req.staffRole = staff.role;
    next();
  });

export const ALL_STAFF: StaffRole[] = ['OWNER', 'MANAGER', 'STAFF'];
export const MANAGERS: StaffRole[] = ['OWNER', 'MANAGER'];
