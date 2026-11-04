import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Body parser failures from express.json()
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'The request body isn’t valid JSON' } });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'TOO_LARGE', message: 'The request is too large' } });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code ?? 'ERROR', message: err.message } });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION', message: 'Check the highlighted fields', fields: err.flatten().fieldErrors },
    });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002')
      return res.status(409).json({ error: { code: 'DUPLICATE', message: 'That already exists' } });
    if (err.code === 'P2025')
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' } });
  }
  // Exclusion constraints from the no_overlap_constraints migration
  const msg = String(err?.message ?? '');
  if (msg.includes('23P01') || msg.includes('no_overlap')) {
    return res
      .status(409)
      .json({ error: { code: 'SLOT_TAKEN', message: 'That court was just booked. Pick another time.' } });
  }
  req.log.error({ err }, 'Unhandled error');
  return res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong on our side' } });
};
