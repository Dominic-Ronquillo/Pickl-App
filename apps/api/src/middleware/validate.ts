import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

/** Parses and replaces req.body / req.query / req.params with zod-validated values. */
export const validate =
  (s: { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny }): RequestHandler =>
  (req, _res, next) => {
    if (s.params) req.params = s.params.parse(req.params);
    if (s.query) Object.defineProperty(req, 'query', { value: s.query.parse(req.query) });
    if (s.body) req.body = s.body.parse(req.body);
    next();
  };
