import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getPool, initDb } from './db';
import type { VacationKind } from '$lib/utils/vacation';

export interface DbVacation extends RowDataPacket {
  id: number;
  user_id: string;
  start_date: string; // YYYY-MM-DD (dateStrings: true im Pool)
  end_date: string;
  note: string | null;
  fraction: string | number; // DECIMAL kommt als String aus mysql2
  kind: string;
  created_at: string;
}

export interface VacationRow {
  id: number;
  start: string;
  end: string;
  note: string | null;
  fraction: number;
  kind: VacationKind;
}

function rowToDto(row: DbVacation): VacationRow {
  return {
    id: row.id,
    start: row.start_date,
    end: row.end_date,
    note: row.note,
    // DECIMAL liefert mysql2 als String; alles, was nicht sauber 0.5 ergibt,
    // ist ein ganzer Tag.
    fraction: Number(row.fraction) === 0.5 ? 0.5 : 1,
    kind: row.kind === 'sick' ? 'sick' : 'vacation',
  };
}

const SELECT_COLS =
  'id, user_id, start_date, end_date, note, fraction, kind, created_at';

/**
 * Alle Einträge eines Users, die das Jahr berühren.
 */
export async function listByYear(userId: string, year: number): Promise<VacationRow[]> {
  await initDb();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const [rows] = await getPool().query<DbVacation[]>(
    `SELECT ${SELECT_COLS}
       FROM vacations
      WHERE user_id = ?
        AND start_date <= ?
        AND end_date >= ?
      ORDER BY start_date DESC`,
    [userId, yearEnd, yearStart]
  );
  return rows.map(rowToDto);
}

/**
 * Alle Einträge eines Users (für Listenseite).
 */
export async function listAll(userId: string): Promise<VacationRow[]> {
  await initDb();
  const [rows] = await getPool().query<DbVacation[]>(
    `SELECT ${SELECT_COLS}
       FROM vacations
      WHERE user_id = ?
      ORDER BY start_date DESC`,
    [userId]
  );
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
  const [rows] = await getPool().query<DbVacation[]>(
    `SELECT ${SELECT_COLS}
       FROM vacations
      WHERE user_id = ?
        AND NOT (end_date < ? OR start_date > ?)
      LIMIT 1`,
    [userId, startDate, endDate]
  );
  return rows.length ? rowToDto(rows[0]) : null;
}

export async function create(
  userId: string,
  startDate: string,
  endDate: string,
  note: string | null,
  fraction: number,
  kind: VacationKind
): Promise<VacationRow> {
  await initDb();
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO vacations (user_id, start_date, end_date, note, fraction, kind)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, startDate, endDate, note, fraction, kind]
  );
  const [rows] = await getPool().query<DbVacation[]>(
    `SELECT ${SELECT_COLS} FROM vacations WHERE id = ?`,
    [result.insertId]
  );
  return rowToDto(rows[0]);
}

export async function remove(userId: string, id: number): Promise<boolean> {
  await initDb();
  const [result] = await getPool().query<ResultSetHeader>(
    `DELETE FROM vacations WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
}
