import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Supabase guard: every table created by a migration must also have Row Level Security
 * enabled by some migration, or Supabase's Data API would expose it with the public anon key.
 */
const dir = join(import.meta.dirname, '../../prisma/migrations');
const sql = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => readFileSync(join(dir, d.name, 'migration.sql'), 'utf8'))
  .join('\n');

describe('migrations', () => {
  it('enable Row Level Security on every table they create', () => {
    const created = [...sql.matchAll(/CREATE TABLE "(\w+)"/g)].map((m) => m[1]);
    const secured = new Set([...sql.matchAll(/ALTER TABLE "(\w+)" ENABLE ROW LEVEL SECURITY/g)].map((m) => m[1]));
    expect(created.length).toBeGreaterThan(0);
    expect(created.filter((t) => !secured.has(t))).toEqual([]);
  });
});
