import { sql, initDb } from './db';

export interface DbVacation {
  id: number;
  user_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  note: string | null;
  created_at: string;
}

export interface VacationRow {
  id: number;
  start: string;
  end: string;
  note: string | null;
}

function rowToDto(row: DbVacation): VacationRow {
  return {
    id: row.id,
    start: row.start_date,
    end: row.end_date,
    note: row.note,
  };
}

/**
 * Alle Einträge eines Users, die das Jahr berühren.
 */
export async function listByYear(userId: string, year: number): Promise<VacationRow[]> {
  await initDb();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const rows = await sql<DbVacation[]>`
    SELECT id, user_id, start_date, end_date, note, created_at
    FROM vacations
    WHERE user_id = ${userId}
      AND start_date <= ${yearEnd}
      AND end_date >= ${yearStart}
    ORDER BY start_date DESC
  `;
  return rows.map(rowToDto);
}

/**
 * Alle Einträge eines Users (für Listenseite).
 */
export async function listAll(userId: string): Promise<VacationRow[]> {
  await initDb();
  const rows = await sql<DbVacation[]>`
    SELECT id, user_id, start_date, end_date, note, created_at
    FROM vacations
    WHERE user_id = ${userId}
    ORDER BY start_date DESC
  `;
  return rows.map(rowToDto);
}

/**
 * Prüft, ob der Zeitraum mit einem existierenden überlappt.
 * Gibt den kollidierenden Eintrag zurück oder null.
 */
export async function findOverlap(
  userId: string,
  startDate: string,
  endDate: string
): Promise<VacationRow | null> {
  await initDb();
  const rows = await sql<DbVacation[]>`
    SELECT id, user_id, start_date, end_date, note, created_at
    FROM vacations
    WHERE user_id = ${userId}
      AND NOT (end_date < ${startDate} OR start_date > ${endDate})
    LIMIT 1
  `;
  return rows.length ? rowToDto(rows[0]) : null;
}

export async function create(
  userId: string,
  startDate: string,
  endDate: string,
  note: string | null
): Promise<VacationRow> {
  await initDb();
  const rows = await sql<DbVacation[]>`
    INSERT INTO vacations (user_id, start_date, end_date, note)
    VALUES (${userId}, ${startDate}, ${endDate}, ${note})
    RETURNING id, user_id, start_date, end_date, note, created_at
  `;
  return rowToDto(rows[0]);
}

export async function remove(userId: string, id: number): Promise<boolean> {
  await initDb();
  const rows = await sql`
    DELETE FROM vacations
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING id
  `;
  return rows.count > 0;
}
