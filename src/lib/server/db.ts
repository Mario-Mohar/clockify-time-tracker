import mysql, { type Pool } from 'mysql2/promise';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export const pool: Pool = mysql.createPool({
  uri: env.DATABASE_URL,
  connectionLimit: 10,
  dateStrings: true,
  timezone: 'Z',
  charset: 'utf8mb4',
  waitForConnections: true,
});

let initPromise: Promise<void> | null = null;

export function initDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS vacations (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          user_id     VARCHAR(64) NOT NULL,
          start_date  DATE NOT NULL,
          end_date    DATE NOT NULL,
          note        TEXT,
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await pool.query(`
        CREATE INDEX vacations_user_date_idx
          ON vacations (user_id, start_date, end_date)
      `).catch((err: { code?: string }) => {
        if (err.code !== 'ER_DUP_KEYNAME') throw err;
      });
    })();
  }
  return initPromise;
}
