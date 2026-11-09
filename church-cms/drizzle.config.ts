import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/platform/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
});
