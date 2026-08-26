import mysql, { type Pool } from 'mysql2/promise';
import { env } from '$env/dynamic/private';

let _pool: Pool | undefined;

export function getPool(): Pool {
  if (_pool) return _pool;
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  _pool = mysql.createPool({
    uri: env.DATABASE_URL,
    connectionLimit: 10,
    dateStrings: true,
    timezone: 'Z',
    charset: 'utf8mb4',
    waitForConnections: true,
  });
  return _pool;
}

let initPromise: Promise<void> | null = null;

export function initDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const pool = getPool();
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
