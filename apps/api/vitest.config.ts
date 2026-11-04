import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/courtside_test',
      JWT_SECRET: process.env.JWT_SECRET ?? 'test-only-secret-that-is-at-least-32-chars',
    },
  },
});
