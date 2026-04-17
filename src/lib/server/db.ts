import postgres from 'postgres';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export const sql = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
});

let initPromise: Promise<void> | null = null;

export function initDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS vacations (
          id          SERIAL PRIMARY KEY,
          user_id     TEXT NOT NULL,
          start_date  DATE NOT NULL,
          end_date    DATE NOT NULL,
          note        TEXT,
          created_at  TIMESTAMP DEFAULT NOW()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS vacations_user_date_idx
          ON vacations (user_id, start_date, end_date)
      `;
    })();
  }
  return initPromise;
}
