# Urlaubsverwaltung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistente Urlaubsverwaltung mit PostgreSQL, Kontingent-Tracking (25 Tage/Jahr), Dashboard-Integration (Urlaub erhöht Ist-Zeit) und eigener Verwaltungsseite `/urlaub`.

**Architecture:** SvelteKit-Server-Routes (`src/routes/api/vacations/...`) kapseln DB-Zugriff über `postgres` (Porsager). Pure Berechnungslogik in `src/lib/utils/vacation.ts` (testbar ohne DB). Dashboard lädt Urlaub parallel zu Clockify — Fehler in einem der beiden entkoppelt den anderen nicht.

**Tech Stack:** SvelteKit 2 + Svelte 5, TypeScript, PostgreSQL (via Porsager `postgres`), date-fns, Vitest (neu), Docker Compose (lokal).

**Spec:** `docs/superpowers/specs/2026-04-16-urlaubsverwaltung-design.md`

---

## File Structure

**Neu:**
- `docker-compose.yml` — lokaler Postgres (Root)
- `vitest.config.ts` — Test-Konfiguration (Root)
- `src/lib/server/db.ts` — Postgres-Singleton + `initDb()`
- `src/lib/server/vacations.ts` — Query-Funktionen (listByYear, create, remove, checkOverlap)
- `src/lib/utils/vacation.ts` — pure Berechnungslogik (Tage pro Jahr, genommen/geplant-Split)
- `src/lib/utils/vacation.test.ts` — Unit-Tests
- `src/lib/api/vacations.ts` — Client-seitiger Fetch-Wrapper
- `src/lib/stores/vacations.ts` — Svelte-Store mit Lade-/Cache-Logik
- `src/lib/components/VacationTile.svelte` — Dashboard-Kachel
- `src/lib/components/VacationModal.svelte` — Neu-Eintrag-Modal
- `src/lib/components/VacationList.svelte` — Jahres-gruppierte Liste
- `src/routes/api/vacations/+server.ts` — GET + POST
- `src/routes/api/vacations/[id]/+server.ts` — DELETE
- `src/routes/urlaub/+page.svelte` — Verwaltungsseite
- `.env.example` — um `DATABASE_URL` erweitert

**Modifiziert:**
- `package.json` — deps (`postgres`), devDeps (`vitest`, `@vitest/ui`), scripts (`test`)
- `src/lib/utils/calculations.ts` — `TimeComparison` erweitert (`vacationHours`, `clockifyHours`)
- `src/lib/components/Dashboard.svelte` — VacationTile einbinden, Urlaub in Ist-Berechnung
- `src/lib/stores/config.ts` — `vacationBudget: number` (default 25) in WorkConfig

---

## Task 1: Vitest-Test-Setup

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest**

```bash
npm install --save-dev vitest @vitest/ui
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.test.ts'],
    globals: true,
    environment: 'node',
  },
});
```

- [ ] **Step 3: Add test script to `package.json`**

In `scripts` section, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create sanity-check test**

Create `src/lib/utils/vacation.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('vacation tests setup', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run test — must pass**

```bash
npm test
```
Expected: `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/lib/utils/vacation.test.ts
git commit -m "chore: add vitest test infrastructure"
```

---

## Task 2: Docker Compose + .env für lokale DB

**Files:**
- Create: `docker-compose.yml`
- Modify: `.env.example`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: zeiterfassung
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

- [ ] **Step 2: Update `.env.example`**

Append:
```
# PostgreSQL
# Railway setzt DATABASE_URL automatisch. Lokal: `docker-compose up -d`
DATABASE_URL=postgres://postgres:postgres@localhost:5432/zeiterfassung
```

- [ ] **Step 3: Start Postgres und verify**

```bash
docker compose up -d
docker compose ps
```
Expected: `postgres` service running, port 5432 exposed.

- [ ] **Step 4: Smoke-test Verbindung**

```bash
docker compose exec postgres psql -U postgres -d zeiterfassung -c "SELECT 1"
```
Expected: `(1 row)` mit Wert `1`.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "chore: add docker-compose postgres for local dev"
```

---

## Task 3: DB-Client + Schema-Init

**Files:**
- Create: `src/lib/server/db.ts`
- Modify: `package.json`, `.env` (lokal, nicht commit)

- [ ] **Step 1: Install postgres package**

```bash
npm install postgres
```

- [ ] **Step 2: Create lokale `.env`**

```bash
cp .env.example .env
```

Then edit `.env` and set `DATABASE_URL=postgres://postgres:postgres@localhost:5432/zeiterfassung`.

- [ ] **Step 3: Create `src/lib/server/db.ts`**

```ts
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
```

- [ ] **Step 4: Verify module loads without runtime error**

Start dev server:
```bash
npm run dev
```
Expected: Server startet ohne Fehler (die Datei wird nicht automatisch importiert, nur geprüft dass sie typecheckt).

Stop server (Ctrl+C) after confirming.

- [ ] **Step 5: Run typecheck**

```bash
npm run check
```
Expected: 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/server/db.ts
git commit -m "feat(db): add postgres client and schema init"
```

---

## Task 4: Pure Vacation-Utility — Tage pro Jahr zählen

**Files:**
- Create: `src/lib/utils/vacation.ts`
- Modify: `src/lib/utils/vacation.test.ts`

- [ ] **Step 1: Replace sanity test with real tests in `src/lib/utils/vacation.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { countVacationDaysInYear } from './vacation';

describe('countVacationDaysInYear', () => {
  it('counts working days only (Mo–Fr, no holidays) within a single year', () => {
    // 20.07.2026 (Mo) – 24.07.2026 (Fr) = 5 Arbeitstage
    const days = countVacationDaysInYear(
      { start: '2026-07-20', end: '2026-07-24' },
      2026,
      'W'
    );
    expect(days).toBe(5);
  });

  it('excludes holidays (e.g. Nationalfeiertag 26.10.)', () => {
    // 26.10.2026 is a Monday AND Nationalfeiertag in Austria.
    // Range 26.10.2026 (Mo, Feiertag) – 30.10.2026 (Fr) = 4 Arbeitstage
    const days = countVacationDaysInYear(
      { start: '2026-10-26', end: '2026-10-30' },
      2026,
      'W'
    );
    expect(days).toBe(4);
  });

  it('splits entries crossing year boundary: only counts days in the requested year', () => {
    // 28.12.2026 (Mo) – 05.01.2027 (Di)
    // Year 2026: 28.12 (Mo), 29.12 (Di), 30.12 (Mi), 31.12 (Do) = 4 Arbeitstage
    // Year 2027: 04.01 (Mo), 05.01 (Di) = 2 Arbeitstage
    //   (01.01 Fr = Neujahr/Feiertag, 02.01 Sa, 03.01 So)
    const entry = { start: '2026-12-28', end: '2027-01-05' };
    expect(countVacationDaysInYear(entry, 2026, 'W')).toBe(4);
    expect(countVacationDaysInYear(entry, 2027, 'W')).toBe(2);
  });

  it('returns 0 if the entry does not overlap the year', () => {
    const days = countVacationDaysInYear(
      { start: '2025-07-20', end: '2025-07-24' },
      2026,
      'W'
    );
    expect(days).toBe(0);
  });

  it('handles single-day entries', () => {
    // 21.07.2026 is a Tuesday
    const days = countVacationDaysInYear(
      { start: '2026-07-21', end: '2026-07-21' },
      2026,
      'W'
    );
    expect(days).toBe(1);
  });

  it('returns 0 for a weekend-only entry', () => {
    // 18.07.2026 (Sa) - 19.07.2026 (So)
    const days = countVacationDaysInYear(
      { start: '2026-07-18', end: '2026-07-19' },
      2026,
      'W'
    );
    expect(days).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```
Expected: Alle Tests fehlschlagen mit "countVacationDaysInYear is not a function" oder Import-Fehler.

- [ ] **Step 3: Implement `src/lib/utils/vacation.ts`**

```ts
import { countWorkingDaysWithHolidays } from './holidays';
import type { AustrianState } from './holidays';

export interface VacationEntry {
  id?: number;
  start: string; // ISO date YYYY-MM-DD
  end: string;   // ISO date YYYY-MM-DD
  note?: string | null;
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function countVacationDaysInYear(
  entry: Pick<VacationEntry, 'start' | 'end'>,
  year: number,
  state: AustrianState
): number {
  const start = parseDate(entry.start);
  const end = parseDate(entry.end);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const rangeStart = start > yearStart ? start : yearStart;
  const rangeEnd = end < yearEnd ? end : yearEnd;

  if (rangeStart > rangeEnd) return 0;

  return countWorkingDaysWithHolidays(rangeStart, rangeEnd, state);
}
```

- [ ] **Step 4: Run tests — all must pass**

```bash
npm test
```
Expected: alle 6 Tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/vacation.ts src/lib/utils/vacation.test.ts
git commit -m "feat(vacation): count working days per year with holiday/boundary logic"
```

---

## Task 5: Pure Vacation-Utility — Genommen/Geplant-Split

**Files:**
- Modify: `src/lib/utils/vacation.ts`, `src/lib/utils/vacation.test.ts`

- [ ] **Step 1: Add tests in `src/lib/utils/vacation.test.ts`**

Append to existing file:
```ts
import { summarizeVacationYear } from './vacation';

describe('summarizeVacationYear', () => {
  const TODAY = new Date(2026, 6, 20); // 2026-07-20 (Monday)

  it('splits into taken (<= today) and planned (> today)', () => {
    const entries = [
      { start: '2026-03-02', end: '2026-03-06' }, // 5 days, all past → taken
      { start: '2026-09-14', end: '2026-09-18' }, // 5 days, all future → planned
    ];
    const summary = summarizeVacationYear(entries, 2026, 'W', TODAY);
    expect(summary.taken).toBe(5);
    expect(summary.planned).toBe(5);
    expect(summary.total).toBe(10);
  });

  it('splits a single entry that spans today', () => {
    // 2026-07-20 (today, Mo) - 2026-07-24 (Fr) = 5 working days
    // Taken: today only = 1; Planned: Tue-Fri = 4
    const entries = [{ start: '2026-07-20', end: '2026-07-24' }];
    const summary = summarizeVacationYear(entries, 2026, 'W', TODAY);
    expect(summary.taken).toBe(1);
    expect(summary.planned).toBe(4);
    expect(summary.total).toBe(5);
  });

  it('ignores entries outside the requested year for the summary', () => {
    const entries = [
      { start: '2025-07-20', end: '2025-07-24' }, // other year
      { start: '2026-03-02', end: '2026-03-06' }, // 5 days 2026, taken
    ];
    const summary = summarizeVacationYear(entries, 2026, 'W', TODAY);
    expect(summary.taken).toBe(5);
    expect(summary.planned).toBe(0);
    expect(summary.total).toBe(5);
  });

  it('handles year-boundary entry correctly', () => {
    // 28.12.2026 (Mo) – 05.01.2027 (Di)
    // For year 2026 with today = 2026-07-20: all 4 days in 2026 are future → planned
    const entries = [{ start: '2026-12-28', end: '2027-01-05' }];
    const summary = summarizeVacationYear(entries, 2026, 'W', TODAY);
    expect(summary.taken).toBe(0);
    expect(summary.planned).toBe(4);
    expect(summary.total).toBe(4);
  });

  it('returns zeros for an empty list', () => {
    const summary = summarizeVacationYear([], 2026, 'W', TODAY);
    expect(summary).toEqual({ taken: 0, planned: 0, total: 0 });
  });
});
```

- [ ] **Step 2: Run tests — must fail**

```bash
npm test
```
Expected: `summarizeVacationYear is not exported` / fails.

- [ ] **Step 3: Implement in `src/lib/utils/vacation.ts`**

Append:
```ts
export interface VacationSummary {
  taken: number;
  planned: number;
  total: number;
}

export function summarizeVacationYear(
  entries: Pick<VacationEntry, 'start' | 'end'>[],
  year: number,
  state: AustrianState,
  today: Date
): VacationSummary {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const todayYyyyMmDd = toIsoDate(today);

  let taken = 0;
  let planned = 0;

  for (const entry of entries) {
    const start = parseDate(entry.start);
    const end = parseDate(entry.end);
    const rangeStart = start > yearStart ? start : yearStart;
    const rangeEnd = end < yearEnd ? end : yearEnd;
    if (rangeStart > rangeEnd) continue;

    // Split the clipped range at today.
    const takenEnd = rangeEnd <= today ? rangeEnd : today;
    const plannedStart = new Date(today);
    plannedStart.setDate(plannedStart.getDate() + 1);

    if (rangeStart <= takenEnd && rangeStart <= today) {
      taken += countWorkingDaysWithHolidays(rangeStart, takenEnd, state);
    }
    if (plannedStart <= rangeEnd) {
      const pStart = rangeStart > plannedStart ? rangeStart : plannedStart;
      planned += countWorkingDaysWithHolidays(pStart, rangeEnd, state);
    }
  }

  return { taken, planned, total: taken + planned };
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
```

- [ ] **Step 4: Run tests — all must pass**

```bash
npm test
```
Expected: alle Tests pass (6 aus Task 4 + 5 neue).

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/vacation.ts src/lib/utils/vacation.test.ts
git commit -m "feat(vacation): summarize taken/planned days per year"
```

---

## Task 6: Vacation-Stunden für Clockify-Zeitraum

**Files:**
- Modify: `src/lib/utils/vacation.ts`, `src/lib/utils/vacation.test.ts`

Dashboard braucht: "Wie viele Urlaubsstunden fallen in diesen Zeitraum (Tag/Woche/Monat/Jahr)?"

- [ ] **Step 1: Add tests**

Append to `vacation.test.ts`:
```ts
import { vacationHoursInRange } from './vacation';

describe('vacationHoursInRange', () => {
  it('returns hoursPerDay * working days in the range', () => {
    // Week 2026-07-20 (Mo) to 2026-07-26 (So): vacation 20.-22.07 = 3 days
    const entries = [{ start: '2026-07-20', end: '2026-07-22' }];
    const hours = vacationHoursInRange(
      entries,
      new Date(2026, 6, 20),
      new Date(2026, 6, 26),
      'W',
      8 // hoursPerDay
    );
    expect(hours).toBe(24);
  });

  it('clips entries that extend beyond the range', () => {
    // Entry: 2026-07-20 - 2026-07-31 (10 working days)
    // Range: only 2026-07-20 - 2026-07-24 (5 working days) → 40h
    const entries = [{ start: '2026-07-20', end: '2026-07-31' }];
    const hours = vacationHoursInRange(
      entries,
      new Date(2026, 6, 20),
      new Date(2026, 6, 24),
      'W',
      8
    );
    expect(hours).toBe(40);
  });

  it('returns 0 when no entries overlap', () => {
    const entries = [{ start: '2026-03-02', end: '2026-03-06' }];
    const hours = vacationHoursInRange(
      entries,
      new Date(2026, 6, 20),
      new Date(2026, 6, 26),
      'W',
      8
    );
    expect(hours).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests — must fail**

```bash
npm test
```

- [ ] **Step 3: Implement in `src/lib/utils/vacation.ts`**

Append:
```ts
export function vacationHoursInRange(
  entries: Pick<VacationEntry, 'start' | 'end'>[],
  rangeStart: Date,
  rangeEnd: Date,
  state: AustrianState,
  hoursPerDay: number
): number {
  let total = 0;
  for (const entry of entries) {
    const start = parseDate(entry.start);
    const end = parseDate(entry.end);
    const clipStart = start > rangeStart ? start : rangeStart;
    const clipEnd = end < rangeEnd ? end : rangeEnd;
    if (clipStart > clipEnd) continue;
    total += countWorkingDaysWithHolidays(clipStart, clipEnd, state);
  }
  return total * hoursPerDay;
}
```

- [ ] **Step 4: Run tests — all must pass**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/vacation.ts src/lib/utils/vacation.test.ts
git commit -m "feat(vacation): compute vacation hours within a date range"
```

---

## Task 7: Server-Query-Layer (Vacation DB-Funktionen)

**Files:**
- Create: `src/lib/server/vacations.ts`

Dieses Modul kapselt DB-Zugriffe. Keine Tests — diese Funktionen hitten echte DB; Verification im manuellen Smoketest am Ende.

- [ ] **Step 1: Create `src/lib/server/vacations.ts`**

```ts
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
```

- [ ] **Step 2: Run typecheck**

```bash
npm run check
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/vacations.ts
git commit -m "feat(vacation): add server-side query layer"
```

---

## Task 8: Server-Helper — Clockify-Auth für API-Routen

**Files:**
- Create: `src/lib/server/auth.ts`

Validiert den Clockify-API-Key und gibt die `userId` zurück. Wird in allen drei API-Routen gebraucht.

- [ ] **Step 1: Create `src/lib/server/auth.ts`**

```ts
import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

interface ClockifyUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Liest den Clockify-API-Key aus dem 'X-Api-Key'-Header,
 * validiert ihn gegen Clockify und gibt die userId zurück.
 * Wirft `error(401, ...)` bei fehlendem oder ungültigem Key.
 */
export async function requireClockifyUserId(event: RequestEvent): Promise<string> {
  const apiKey = event.request.headers.get('x-api-key');
  if (!apiKey) {
    throw error(401, 'Missing X-Api-Key header');
  }

  const res = await fetch('https://api.clockify.me/api/v1/user', {
    headers: { 'X-Api-Key': apiKey },
  });

  if (!res.ok) {
    throw error(401, 'Invalid Clockify API key');
  }

  const user = (await res.json()) as ClockifyUser;
  return user.id;
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run check
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/auth.ts
git commit -m "feat(vacation): add clockify auth helper for api routes"
```

---

## Task 9: API-Route `GET /api/vacations` + `POST /api/vacations`

**Files:**
- Create: `src/routes/api/vacations/+server.ts`

- [ ] **Step 1: Create `src/routes/api/vacations/+server.ts`**

```ts
import { json, error, type RequestHandler } from '@sveltejs/kit';
import { requireClockifyUserId } from '$lib/server/auth';
import { listByYear, listAll, create, findOverlap } from '$lib/server/vacations';

export const GET: RequestHandler = async (event) => {
  const userId = await requireClockifyUserId(event);
  const yearParam = event.url.searchParams.get('year');

  if (yearParam) {
    const year = Number(yearParam);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw error(400, 'Invalid year parameter');
    }
    const rows = await listByYear(userId, year);
    return json({ vacations: rows });
  }

  const rows = await listAll(userId);
  return json({ vacations: rows });
};

export const POST: RequestHandler = async (event) => {
  const userId = await requireClockifyUserId(event);
  const body = await event.request.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    throw error(400, 'Invalid JSON body');
  }

  const { start, end, note } = body as { start?: unknown; end?: unknown; note?: unknown };

  if (typeof start !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(start)) {
    throw error(400, 'start must be an ISO date (YYYY-MM-DD)');
  }
  if (typeof end !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw error(400, 'end must be an ISO date (YYYY-MM-DD)');
  }
  if (end < start) {
    throw error(400, 'end must be >= start');
  }
  const noteStr = typeof note === 'string' && note.trim().length > 0 ? note.trim() : null;

  const conflict = await findOverlap(userId, start, end);
  if (conflict) {
    return json(
      { error: 'overlap', conflictsWith: conflict },
      { status: 409 }
    );
  }

  const row = await create(userId, start, end, noteStr);
  return json({ vacation: row }, { status: 201 });
};
```

- [ ] **Step 2: Run typecheck**

```bash
npm run check
```

- [ ] **Step 3: Smoke-test manually — GET**

Start the dev server:
```bash
npm run dev
```

In another terminal, replace `YOUR_KEY` with your real Clockify key:
```bash
curl -s http://localhost:5173/api/vacations?year=2026 -H "X-Api-Key: YOUR_KEY"
```
Expected: `{"vacations":[]}`

- [ ] **Step 4: Smoke-test — POST**

```bash
curl -s -X POST http://localhost:5173/api/vacations \
  -H "X-Api-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"start":"2026-07-20","end":"2026-07-24","note":"Test"}'
```
Expected: `{"vacation":{"id":1,"start":"2026-07-20","end":"2026-07-24","note":"Test"}}`

- [ ] **Step 5: Smoke-test — Overlap-Reject**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5173/api/vacations \
  -H "X-Api-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"start":"2026-07-22","end":"2026-07-26"}'
```
Expected: `409`

Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add src/routes/api/vacations/+server.ts
git commit -m "feat(vacation): add GET/POST /api/vacations"
```

---

## Task 10: API-Route `DELETE /api/vacations/[id]`

**Files:**
- Create: `src/routes/api/vacations/[id]/+server.ts`

- [ ] **Step 1: Create `src/routes/api/vacations/[id]/+server.ts`**

```ts
import { json, error, type RequestHandler } from '@sveltejs/kit';
import { requireClockifyUserId } from '$lib/server/auth';
import { remove } from '$lib/server/vacations';

export const DELETE: RequestHandler = async (event) => {
  const userId = await requireClockifyUserId(event);
  const id = Number(event.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw error(400, 'Invalid id');
  }

  const deleted = await remove(userId, id);
  if (!deleted) {
    throw error(404, 'Vacation not found');
  }
  return json({ ok: true });
};
```

- [ ] **Step 2: Run typecheck**

```bash
npm run check
```

- [ ] **Step 3: Smoke-test — DELETE existing**

Start dev server. Then (use the id from Task 9 — likely `1`):
```bash
curl -s -X DELETE http://localhost:5173/api/vacations/1 \
  -H "X-Api-Key: YOUR_KEY"
```
Expected: `{"ok":true}`

- [ ] **Step 4: Smoke-test — DELETE non-existing**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:5173/api/vacations/9999 \
  -H "X-Api-Key: YOUR_KEY"
```
Expected: `404`

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/vacations/[id]/+server.ts
git commit -m "feat(vacation): add DELETE /api/vacations/[id]"
```

---

## Task 11: Client-seitiger Fetch-Wrapper

**Files:**
- Create: `src/lib/api/vacations.ts`

- [ ] **Step 1: Create `src/lib/api/vacations.ts`**

```ts
export interface VacationRow {
  id: number;
  start: string;
  end: string;
  note: string | null;
}

export interface VacationApiError {
  status: number;
  message: string;
  conflictsWith?: VacationRow;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let conflictsWith: VacationRow | undefined;
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error === 'overlap') conflictsWith = body.conflictsWith;
      if (body?.message) message = body.message;
    } catch {
      // ignore body parse error
    }
    const err: VacationApiError = { status: res.status, message, conflictsWith };
    throw err;
  }
  return res.json() as Promise<T>;
}

export function createVacationsApi(apiKey: string) {
  const headers = { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' };

  return {
    async listByYear(year: number): Promise<VacationRow[]> {
      const res = await fetch(`/api/vacations?year=${year}`, { headers });
      const body = await handle<{ vacations: VacationRow[] }>(res);
      return body.vacations;
    },

    async listAll(): Promise<VacationRow[]> {
      const res = await fetch(`/api/vacations`, { headers });
      const body = await handle<{ vacations: VacationRow[] }>(res);
      return body.vacations;
    },

    async create(start: string, end: string, note: string | null): Promise<VacationRow> {
      const res = await fetch(`/api/vacations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ start, end, note }),
      });
      const body = await handle<{ vacation: VacationRow }>(res);
      return body.vacation;
    },

    async remove(id: number): Promise<void> {
      const res = await fetch(`/api/vacations/${id}`, {
        method: 'DELETE',
        headers,
      });
      await handle<{ ok: true }>(res);
    },
  };
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run check
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/vacations.ts
git commit -m "feat(vacation): add client fetch wrapper"
```

---

## Task 12: Config erweitern — `vacationBudget`

**Files:**
- Modify: `src/lib/utils/calculations.ts`, `src/lib/stores/config.ts`

- [ ] **Step 1: Extend `WorkConfig` in `src/lib/utils/calculations.ts`**

Find the `WorkConfig` interface (near line 24) and add `vacationBudget`:
```ts
export interface WorkConfig {
  weeklyHours: number;
  workDaysPerWeek: number;
  startOfWeek: 'monday' | 'sunday';
  state: AustrianState;
  vacationBudget: number; // Tage/Jahr, default 25
}
```

Find `DEFAULT_CONFIG` (near line 44) and add:
```ts
export const DEFAULT_CONFIG: WorkConfig = {
  weeklyHours: 40,
  workDaysPerWeek: 5,
  startOfWeek: 'monday',
  state: 'W',
  vacationBudget: 25,
};
```

- [ ] **Step 2: Migration in `src/lib/stores/config.ts`**

In `loadConfig()`, inside the `if (stored)` block, add a migration (right next to the existing state migration):
```ts
if (config.vacationBudget === undefined) {
  config.vacationBudget = DEFAULT_CONFIG.vacationBudget;
  saveConfig(config);
}
```

Also add an updater method on the store (next to `setState`):
```ts
setVacationBudget(days: number) {
  update((config) => {
    const newConfig = { ...config, vacationBudget: days };
    saveConfig(newConfig);
    return newConfig;
  });
},
```

- [ ] **Step 3: Run typecheck**

```bash
npm run check
```
Expected: 0 errors. (Old configs from localStorage will get migrated on load.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils/calculations.ts src/lib/stores/config.ts
git commit -m "feat(config): add vacationBudget with migration"
```

---

## Task 13: Vacation-Store (Client-State)

**Files:**
- Create: `src/lib/stores/vacations.ts`

- [ ] **Step 1: Create `src/lib/stores/vacations.ts`**

```ts
import { writable, get } from 'svelte/store';
import { createVacationsApi, type VacationRow, type VacationApiError } from '$lib/api/vacations';
import { auth } from './auth';

interface VacationsState {
  byYear: Record<number, VacationRow[]>;
  isLoading: boolean;
  error: VacationApiError | null;
}

function createStore() {
  const { subscribe, update, set } = writable<VacationsState>({
    byYear: {},
    isLoading: false,
    error: null,
  });

  function getApi() {
    const apiKey = auth.getApiKey();
    if (!apiKey) throw new Error('Not authenticated');
    return createVacationsApi(apiKey);
  }

  async function loadYear(year: number): Promise<void> {
    update((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const rows = await getApi().listByYear(year);
      update((s) => ({ ...s, byYear: { ...s.byYear, [year]: rows }, isLoading: false }));
    } catch (err) {
      update((s) => ({ ...s, isLoading: false, error: err as VacationApiError }));
      throw err;
    }
  }

  async function addEntry(start: string, end: string, note: string | null): Promise<VacationRow> {
    const row = await getApi().create(start, end, note);
    // Reload affected years
    const startYear = Number(row.start.slice(0, 4));
    const endYear = Number(row.end.slice(0, 4));
    for (let y = startYear; y <= endYear; y++) {
      if (get({ subscribe }).byYear[y] !== undefined) {
        await loadYear(y);
      }
    }
    return row;
  }

  async function removeEntry(id: number): Promise<void> {
    await getApi().remove(id);
    // Invalidate all cached years (simplest correct approach)
    const state = get({ subscribe });
    for (const y of Object.keys(state.byYear)) {
      await loadYear(Number(y));
    }
  }

  function reset() {
    set({ byYear: {}, isLoading: false, error: null });
  }

  return { subscribe, loadYear, addEntry, removeEntry, reset };
}

export const vacations = createStore();
```

- [ ] **Step 2: Run typecheck**

```bash
npm run check
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/vacations.ts
git commit -m "feat(vacation): add client-side vacation store"
```

---

## Task 14: Dashboard-Kachel `VacationTile`

**Files:**
- Create: `src/lib/components/VacationTile.svelte`

- [ ] **Step 1: Create `src/lib/components/VacationTile.svelte`**

```svelte
<script lang="ts">
  import type { VacationSummary } from '$lib/utils/vacation';

  export let year: number;
  export let summary: VacationSummary | null;
  export let budget: number;
  export let isLoading: boolean;
  export let error: string | null;
  export let onRetry: () => void;
  export let onClick: () => void;

  $: available = summary ? budget - summary.taken - summary.planned : null;
  $: isNegative = available !== null && available < 0;
</script>

<button class="tile" on:click={onClick} disabled={isLoading} type="button">
  <div class="title">Urlaub {year}</div>

  {#if isLoading}
    <div class="loading">Lade …</div>
  {:else if error}
    <div class="error">
      <div>⚠️ {error}</div>
      <button
        class="retry"
        type="button"
        on:click|stopPropagation={onRetry}
      >
        Erneut versuchen
      </button>
    </div>
  {:else if summary}
    <div class="stats">
      <div class="stat">
        <div class="value">{summary.taken}</div>
        <div class="label">Genommen</div>
      </div>
      <div class="stat">
        <div class="value">{summary.planned}</div>
        <div class="label">Geplant</div>
      </div>
      <div class="stat" class:negative={isNegative}>
        <div class="value">{available}</div>
        <div class="label">Verfügbar</div>
      </div>
    </div>
  {/if}
</button>

<style>
  .tile {
    display: block;
    width: 100%;
    background: white;
    border: none;
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    margin-bottom: 1.5rem;
    cursor: pointer;
    text-align: left;
    font: inherit;
  }

  .tile:disabled {
    cursor: default;
  }

  .title {
    font-size: 0.875rem;
    color: #718096;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .stat {
    text-align: center;
  }

  .stat .value {
    font-size: 1.75rem;
    font-weight: 700;
    color: #2d3748;
  }

  .stat.negative .value {
    color: #e53e3e;
  }

  .stat .label {
    font-size: 0.75rem;
    color: #718096;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.25rem;
  }

  .loading, .error {
    text-align: center;
    color: #718096;
    padding: 1rem 0;
  }

  .retry {
    margin-top: 0.75rem;
    padding: 0.5rem 1rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
  }
</style>
```

- [ ] **Step 2: Run typecheck**

```bash
npm run check
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/VacationTile.svelte
git commit -m "feat(vacation): add dashboard tile component"
```

---

## Task 15: Dashboard-Integration — Tile + Ist-Bonus

**Files:**
- Modify: `src/lib/components/Dashboard.svelte`, `src/lib/utils/calculations.ts`

- [ ] **Step 1: Extend `TimeComparison` in `src/lib/utils/calculations.ts`**

Find interface `TimeComparison` (near line 31) and add two fields:
```ts
export interface TimeComparison {
  requiredHours: number;
  actualHours: number;
  clockifyHours: number;   // NEW: aus Clockify
  vacationHours: number;   // NEW: aus Urlaub
  difference: number;
  status: 'over' | 'good' | 'under';
  period: string;
  workingDays?: number;
  holidays?: number;
}
```

Update each `compare*Hours` function to accept a new parameter and populate the two new fields. Replace the signatures and bodies of the four compare functions as follows:

```ts
export function compareTodayHours(
  clockifyHours: number,
  vacationHours: number,
  config: WorkConfig
): TimeComparison {
  const requiredHours = calculateRequiredToday(config);
  const actualHours = clockifyHours + vacationHours;
  const difference = actualHours - requiredHours;
  const today = new Date();
  return {
    requiredHours,
    actualHours,
    clockifyHours,
    vacationHours,
    difference,
    status: getStatus(difference),
    period: format(today, 'yyyy-MM-dd', { locale: de }),
  };
}

export function compareWeekHours(
  clockifyHours: number,
  vacationHours: number,
  config: WorkConfig,
  date: Date = new Date()
): TimeComparison {
  const requiredHours = calculateRequiredWeek(config, date);
  const actualHours = clockifyHours + vacationHours;
  const difference = actualHours - requiredHours;
  return {
    requiredHours,
    actualHours,
    clockifyHours,
    vacationHours,
    difference,
    status: getStatus(difference),
    period: format(date, "'KW' II/yyyy", { locale: de }),
  };
}

export function compareMonthHours(
  clockifyHours: number,
  vacationHours: number,
  config: WorkConfig,
  date: Date = new Date()
): TimeComparison {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const workingDays = countWorkingDays(monthStart, monthEnd, config);
  const holidays = getMonthHolidays(date.getFullYear(), date.getMonth(), config.state);
  const requiredHours = calculateRequiredMonth(config, date);
  const actualHours = clockifyHours + vacationHours;
  const difference = actualHours - requiredHours;
  return {
    requiredHours,
    actualHours,
    clockifyHours,
    vacationHours,
    difference,
    status: getStatus(difference),
    period: format(date, 'MMMM yyyy', { locale: de }),
    workingDays,
    holidays: holidays.length,
  };
}

export function compareYearHours(
  clockifyHours: number,
  vacationHours: number,
  config: WorkConfig,
  date: Date = new Date()
): TimeComparison {
  const yearStart = startOfYear(date);
  const yearEnd = endOfYear(date);
  const workingDays = countWorkingDays(yearStart, yearEnd, config);
  const holidays = getYearHolidays(date.getFullYear(), config.state);
  const requiredHours = calculateRequiredYear(config, date);
  const actualHours = clockifyHours + vacationHours;
  const difference = actualHours - requiredHours;
  return {
    requiredHours,
    actualHours,
    clockifyHours,
    vacationHours,
    difference,
    status: getStatus(difference),
    period: format(date, 'yyyy', { locale: de }),
    workingDays,
    holidays: holidays.length,
  };
}
```

- [ ] **Step 2: Integrate into Dashboard — script section**

In `src/lib/components/Dashboard.svelte`, in the `<script>` block (starting line 1):

Add imports:
```ts
import { goto } from '$app/navigation';
import { vacations } from '$lib/stores/vacations';
import VacationTile from './VacationTile.svelte';
import { summarizeVacationYear, vacationHoursInRange, type VacationSummary } from '$lib/utils/vacation';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, endOfWeek } from 'date-fns';
```

Add state variables (next to `lastUpdated`):
```ts
let vacationError: string | null = null;
let vacationSummary: VacationSummary | null = null;
```

Replace the `fetchTimeData` function with this version (loads Clockify and vacation independently):
```ts
async function fetchTimeData() {
  if (!$auth.apiKey || !$currentUser || !$currentWorkspace) return;

  isLoading = true;
  error = null;
  vacationError = null;

  const userId = $currentUser.id;
  const workspaceId = $currentWorkspace.id;
  const currentYear = new Date().getFullYear();

  // Load Clockify — errors here must not kill the vacation load
  const clockifyPromise = (async () => {
    const client = createClockifyClient($auth.apiKey!);
    return Promise.all([
      client.getTodayEntries(workspaceId, userId),
      client.getWeekEntries(workspaceId, userId, getWeekStart($workConfig)),
      client.getMonthEntries(workspaceId, userId, new Date().getFullYear(), new Date().getMonth()),
      client.getYearEntries(workspaceId, userId, new Date().getFullYear()),
    ]);
  })();

  // Load vacations — errors here must not kill Clockify display
  const vacationPromise = vacations
    .loadYear(currentYear)
    .catch((err) => {
      vacationError = err?.message || 'Urlaubsdaten nicht verfügbar';
    });

  const [clockifyResult] = await Promise.allSettled([clockifyPromise, vacationPromise]);

  // Build comparisons from whichever data is available.
  const entries = $vacations.byYear[currentYear] ?? [];
  const hoursPerDay = $workConfig.weeklyHours / $workConfig.workDaysPerWeek;
  const now = new Date();
  const weekStart = getWeekStart($workConfig);
  const weekEnd = endOfWeek(now, { weekStartsOn: $workConfig.startOfWeek === 'monday' ? 1 : 0 });

  const vacToday = vacationHoursInRange(entries, now, now, $workConfig.state, hoursPerDay);
  const vacWeek = vacationHoursInRange(entries, weekStart, weekEnd, $workConfig.state, hoursPerDay);
  const vacMonth = vacationHoursInRange(entries, startOfMonth(now), endOfMonth(now), $workConfig.state, hoursPerDay);
  const vacYear = vacationHoursInRange(entries, startOfYear(now), endOfYear(now), $workConfig.state, hoursPerDay);

  if (clockifyResult.status === 'fulfilled') {
    const [today, week, month, year] = clockifyResult.value;
    todayData = compareTodayHours(today.totalHours, vacToday, $workConfig);
    weekData = compareWeekHours(week.totalHours, vacWeek, $workConfig);
    monthData = compareMonthHours(month.totalHours, vacMonth, $workConfig);
    yearData = compareYearHours(year.totalHours, vacYear, $workConfig);
    lastUpdated = new Date();
  } else {
    error = clockifyResult.reason instanceof Error
      ? clockifyResult.reason.message
      : 'Fehler beim Laden der Clockify-Daten';
  }

  // Vacation summary for the tile
  vacationSummary = summarizeVacationYear(entries, currentYear, $workConfig.state, now);

  isLoading = false;
}
```

- [ ] **Step 3: Integrate into Dashboard — template section**

In the template, add the tile after the Period Tabs and before the Main Card. Find the line containing `<!-- Main Card -->` and insert above it:

```svelte
    <!-- Vacation Tile -->
    <VacationTile
      year={new Date().getFullYear()}
      summary={vacationSummary}
      budget={$workConfig.vacationBudget}
      isLoading={$vacations.isLoading}
      error={vacationError}
      onRetry={fetchTimeData}
      onClick={() => goto('/urlaub')}
    />
```

Also modify the Ist-Stat display — find the stat block:
```svelte
<div class="stat">
  <div class="stat-label">Ist</div>
  <div class="stat-value">{formatHours(currentData.actualHours)}</div>
</div>
```

Replace with:
```svelte
<div class="stat">
  <div class="stat-label">Ist</div>
  <div class="stat-value">{formatHours(currentData.actualHours)}</div>
  {#if currentData.vacationHours > 0}
    <div class="stat-sub">
      {formatHours(currentData.clockifyHours)} Clockify + {formatHours(currentData.vacationHours)} Urlaub
    </div>
  {/if}
</div>
```

Add to the `<style>` block:
```css
.stat-sub {
  font-size: 0.7rem;
  color: #718096;
  margin-top: 0.25rem;
}
```

- [ ] **Step 4: Run typecheck**

```bash
npm run check
```
Expected: 0 errors.

- [ ] **Step 5: Manual smoke-test**

Start dev server with docker-compose running:
```bash
docker compose up -d && npm run dev
```
- Login with Clockify key
- Dashboard lädt — sollte Urlaubs-Kachel mit 25/0/0 zeigen (leere DB)
- Tag/Woche/Monat/Jahr-Tabs zeigen reine Clockify-Zahlen (keine Urlaub-Beimischung)
- Stop dev server

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/calculations.ts src/lib/components/Dashboard.svelte
git commit -m "feat(vacation): integrate vacation tile and hours into dashboard"
```

---

## Task 16: `VacationModal`-Komponente

**Files:**
- Create: `src/lib/components/VacationModal.svelte`

- [ ] **Step 1: Create `src/lib/components/VacationModal.svelte`**

```svelte
<script lang="ts">
  import { workConfig } from '$lib/stores/config';
  import { countWorkingDaysWithHolidays, getHolidayCount } from '$lib/utils/holidays';

  export let onSave: (start: string, end: string, note: string | null) => Promise<void>;
  export let onClose: () => void;

  let start = '';
  let end = '';
  let note = '';
  let submitting = false;
  let errorMessage = '';

  function parseDate(iso: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  $: startDate = parseDate(start);
  $: endDate = parseDate(end);
  $: dateInvalid = startDate && endDate && endDate < startDate;
  $: preview = startDate && endDate && !dateInvalid
    ? computePreview(startDate, endDate, $workConfig.state)
    : null;

  function computePreview(s: Date, e: Date, state: typeof $workConfig.state) {
    const workingDays = countWorkingDaysWithHolidays(s, e, state);
    const totalDays = Math.floor((e.getTime() - s.getTime()) / 86_400_000) + 1;
    let weekdays = 0;
    const cur = new Date(s);
    while (cur <= e) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) weekdays++;
      cur.setDate(cur.getDate() + 1);
    }
    const holidays = getHolidayCount(s, e, state);
    return { workingDays, totalDays, weekdays, holidays };
  }

  async function handleSubmit() {
    if (!start || !end || dateInvalid || submitting) return;
    submitting = true;
    errorMessage = '';
    try {
      await onSave(start, end, note.trim() || null);
      onClose();
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string; conflictsWith?: { start: string; end: string } };
      if (e.status === 409 && e.conflictsWith) {
        errorMessage = `Überlappt mit Eintrag ${e.conflictsWith.start} – ${e.conflictsWith.end}`;
      } else {
        errorMessage = e.message || 'Speichern fehlgeschlagen';
      }
    } finally {
      submitting = false;
    }
  }
</script>

<div class="backdrop" on:click={onClose} role="presentation">
  <div class="modal" on:click|stopPropagation role="dialog" aria-label="Urlaub hinzufügen">
    <h2>Urlaub hinzufügen</h2>

    <label>
      Von
      <input type="date" bind:value={start} required />
    </label>

    <label>
      Bis
      <input type="date" bind:value={end} required />
    </label>

    {#if dateInvalid}
      <div class="error">Das Bis-Datum muss ≥ Von-Datum sein.</div>
    {:else if preview}
      <div class="preview">
        → {preview.workingDays} Arbeitstage ({preview.weekdays} Werktage,
        {#if preview.holidays > 0}davon {preview.holidays} Feiertag{preview.holidays > 1 ? 'e' : ''}{:else}keine Feiertage{/if})
      </div>
    {/if}

    <label>
      Notiz (optional)
      <textarea bind:value={note} rows="2" placeholder="z.B. Sommerurlaub"></textarea>
    </label>

    {#if errorMessage}
      <div class="error">{errorMessage}</div>
    {/if}

    <div class="actions">
      <button type="button" class="btn-secondary" on:click={onClose} disabled={submitting}>Abbrechen</button>
      <button
        type="button"
        class="btn-primary"
        on:click={handleSubmit}
        disabled={!start || !end || !!dateInvalid || submitting}
      >
        {submitting ? 'Speichere …' : 'Speichern'}
      </button>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    padding: 1rem;
  }

  .modal {
    background: white;
    border-radius: 1rem;
    padding: 1.5rem;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  }

  h2 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
  }

  label {
    display: block;
    margin-bottom: 1rem;
    color: #2d3748;
    font-size: 0.875rem;
    font-weight: 600;
  }

  input, textarea {
    display: block;
    width: 100%;
    margin-top: 0.25rem;
    padding: 0.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    font: inherit;
    box-sizing: border-box;
  }

  .preview {
    margin: -0.5rem 0 1rem 0;
    color: #4a5568;
    font-size: 0.875rem;
  }

  .error {
    color: #e53e3e;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .btn-primary, .btn-secondary {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: none;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-primary {
    background: #667eea;
    color: white;
  }

  .btn-primary:disabled {
    background: #a0aec0;
    cursor: default;
  }

  .btn-secondary {
    background: #e2e8f0;
    color: #2d3748;
  }
</style>
```

- [ ] **Step 2: Run typecheck**

```bash
npm run check
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/VacationModal.svelte
git commit -m "feat(vacation): add new-entry modal with live preview"
```

---

## Task 17: `VacationList`-Komponente (Jahres-Gruppen)

**Files:**
- Create: `src/lib/components/VacationList.svelte`

- [ ] **Step 1: Create `src/lib/components/VacationList.svelte`**

```svelte
<script lang="ts">
  import { workConfig } from '$lib/stores/config';
  import { summarizeVacationYear } from '$lib/utils/vacation';
  import type { VacationRow } from '$lib/api/vacations';

  export let entries: VacationRow[];
  export let onDelete: (id: number) => Promise<void>;

  $: grouped = groupByYear(entries);

  function groupByYear(list: VacationRow[]): { year: number; items: VacationRow[] }[] {
    const map = new Map<number, VacationRow[]>();
    for (const e of list) {
      const startYear = Number(e.start.slice(0, 4));
      const endYear = Number(e.end.slice(0, 4));
      for (let y = startYear; y <= endYear; y++) {
        if (!map.has(y)) map.set(y, []);
        map.get(y)!.push(e);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, items]) => ({ year, items }));
  }

  function yearSummary(year: number, items: VacationRow[]) {
    return summarizeVacationYear(items, year, $workConfig.state, new Date());
  }

  function formatDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  async function handleDelete(entry: VacationRow) {
    if (!confirm(`Urlaub ${formatDate(entry.start)} – ${formatDate(entry.end)} wirklich löschen?`)) return;
    await onDelete(entry.id);
  }
</script>

{#if grouped.length === 0}
  <div class="empty">Noch keine Urlaubseinträge.</div>
{:else}
  {#each grouped as group (group.year)}
    {@const s = yearSummary(group.year, group.items)}
    <section class="year-group">
      <header class="year-header">
        <span class="year">{group.year}</span>
        <span class="summary">
          {s.taken} Tage genommen{s.planned > 0 ? `, ${s.planned} geplant` : ''}
        </span>
      </header>
      <ul class="entries">
        {#each group.items as entry (entry.id)}
          <li class="entry">
            <div class="dates">
              {formatDate(entry.start)} – {formatDate(entry.end)}
            </div>
            {#if entry.note}
              <div class="note">{entry.note}</div>
            {/if}
            <button type="button" class="delete" on:click={() => handleDelete(entry)} aria-label="Löschen">🗑️</button>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
{/if}

<style>
  .empty {
    color: #a0aec0;
    padding: 2rem 0;
    text-align: center;
  }

  .year-group {
    margin-bottom: 1.5rem;
  }

  .year-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .year {
    font-size: 1.125rem;
    font-weight: 700;
    color: #2d3748;
  }

  .summary {
    font-size: 0.875rem;
    color: #718096;
  }

  .entries {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .entry {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    column-gap: 0.5rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid #f7fafc;
  }

  .dates {
    font-weight: 600;
    color: #2d3748;
  }

  .note {
    grid-column: 1;
    grid-row: 2;
    font-size: 0.875rem;
    color: #718096;
  }

  .delete {
    grid-row: 1 / span 2;
    align-self: center;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.25rem;
    padding: 0.25rem;
  }
</style>
```

- [ ] **Step 2: Run typecheck**

```bash
npm run check
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/VacationList.svelte
git commit -m "feat(vacation): add year-grouped list component"
```

---

## Task 18: Seite `/urlaub`

**Files:**
- Create: `src/routes/urlaub/+page.svelte`

- [ ] **Step 1: Create `src/routes/urlaub/+page.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { isAuthenticated } from '$lib/stores/auth';
  import { vacations } from '$lib/stores/vacations';
  import { createVacationsApi, type VacationRow, type VacationApiError } from '$lib/api/vacations';
  import { auth } from '$lib/stores/auth';
  import VacationList from '$lib/components/VacationList.svelte';
  import VacationModal from '$lib/components/VacationModal.svelte';

  let allEntries: VacationRow[] = [];
  let isLoading = true;
  let loadError: string | null = null;
  let showModal = false;

  async function loadAll() {
    if (!$isAuthenticated) return;
    isLoading = true;
    loadError = null;
    try {
      const apiKey = auth.getApiKey();
      if (!apiKey) throw new Error('Nicht angemeldet');
      allEntries = await createVacationsApi(apiKey).listAll();
    } catch (err) {
      const e = err as VacationApiError;
      loadError = e?.message || 'Fehler beim Laden';
    } finally {
      isLoading = false;
    }
  }

  async function handleSave(start: string, end: string, note: string | null) {
    await vacations.addEntry(start, end, note);
    await loadAll();
  }

  async function handleDelete(id: number) {
    try {
      await vacations.removeEntry(id);
    } catch (err) {
      const e = err as VacationApiError;
      if (e?.status === 404) {
        alert('Eintrag nicht mehr vorhanden');
      } else {
        alert(e?.message || 'Löschen fehlgeschlagen');
      }
    }
    await loadAll();
  }

  onMount(() => {
    if (!$isAuthenticated) {
      goto('/');
      return;
    }
    loadAll();
  });
</script>

<svelte:head>
  <title>Urlaubsverwaltung</title>
</svelte:head>

<div class="page">
  <header class="header">
    <div class="header-content">
      <button type="button" class="back" on:click={() => goto('/')}>← Dashboard</button>
      <h1>Urlaub</h1>
      <span class="spacer" />
    </div>
  </header>

  <div class="container">
    <div class="toolbar">
      <button type="button" class="btn-primary" on:click={() => (showModal = true)}>
        + Urlaub hinzufügen
      </button>
    </div>

    {#if isLoading}
      <div class="info">Lade …</div>
    {:else if loadError}
      <div class="info error">
        ⚠️ {loadError}
        <button type="button" class="btn-secondary" on:click={loadAll}>Erneut versuchen</button>
      </div>
    {:else}
      <VacationList entries={allEntries} onDelete={handleDelete} />
    {/if}
  </div>

  {#if showModal}
    <VacationModal onSave={handleSave} onClose={() => (showModal = false)} />
  {/if}
</div>

<style>
  .page {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .header {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  .header-content {
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
    color: white;
  }

  .back {
    background: none;
    border: none;
    color: white;
    font: inherit;
    cursor: pointer;
  }

  .spacer { width: 5rem; }

  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 1.5rem 1rem;
  }

  .toolbar {
    margin-bottom: 1.5rem;
  }

  .btn-primary {
    background: white;
    color: #667eea;
    border: none;
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: none;
    border-radius: 0.375rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    margin-top: 0.5rem;
  }

  .info {
    background: white;
    border-radius: 0.5rem;
    padding: 1.5rem;
    text-align: center;
    color: #718096;
  }

  .info.error {
    color: #e53e3e;
  }
</style>
```

- [ ] **Step 2: Run typecheck**

```bash
npm run check
```

- [ ] **Step 3: Manual end-to-end smoke-test**

Start dev environment:
```bash
docker compose up -d && npm run dev
```

Then in browser:
- Login with Clockify key
- Click Urlaubs-Kachel → navigates to `/urlaub`
- Leere Liste sichtbar
- Click "+ Urlaub hinzufügen" → Modal öffnet
- Dates eingeben (z.B. 2026-07-20 bis 2026-07-24) → Preview zeigt "5 Arbeitstage (5 Werktage, keine Feiertage)"
- Speichern → Modal schließt, Liste zeigt Eintrag unter "2026"
- Back to Dashboard → Kachel zeigt aktualisierte Werte
- Week/Month/Year-Tabs zeigen `Clockify + Urlaub`-Kombi im Ist
- Zurück zu `/urlaub`, Lösch-Icon klicken → Bestätigung → Eintrag verschwindet
- Re-create entry, versuche Überlappung (21.07.–26.07.) → Modal zeigt "Überlappt mit Eintrag 2026-07-20 – 2026-07-24"

Stop dev server when done.

- [ ] **Step 4: Commit**

```bash
git add src/routes/urlaub/+page.svelte
git commit -m "feat(vacation): add /urlaub management page"
```

---

## Task 19: Logout-Reset für Vacation-Store

**Files:**
- Modify: `src/lib/stores/auth.ts`

Beim Logout soll der In-Memory-Urlaubs-Cache gelöscht werden, damit nach Re-Login eines anderen Users keine alten Daten übrig bleiben.

- [ ] **Step 1: Add reset call in `logout()`**

In `src/lib/stores/auth.ts`, find the `logout()` method. Import `vacations` at the top via lazy import inside the method to avoid circular imports.

Replace `logout()` with:
```ts
logout() {
  const emptyState: AuthState = {
    apiKey: null,
    user: null,
    workspace: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  set(emptyState);
  if (browser) {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Reset vacation cache (lazy import to avoid circular deps)
  import('./vacations').then(({ vacations }) => vacations.reset());
},
```

- [ ] **Step 2: Run typecheck**

```bash
npm run check
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/auth.ts
git commit -m "feat(vacation): reset vacation cache on logout"
```

---

## Task 20: Railway-Deployment-Check

**Files:**
- Modify: `DEPLOYMENT.md` (falls existiert, sonst skip)

- [ ] **Step 1: Check current DEPLOYMENT.md**

```bash
head -50 DEPLOYMENT.md
```

- [ ] **Step 2: Append DB-Section to `DEPLOYMENT.md`**

Add to end of file:
```markdown

## PostgreSQL auf Railway

Die Urlaubsverwaltung braucht eine Postgres-DB.

1. Im Railway-Projekt: **+ New → Database → Add PostgreSQL**
2. Railway verlinkt die `DATABASE_URL` automatisch mit dem App-Service (in den App-Variablen sichtbar)
3. Keine weiteren Schritte — Schema wird beim ersten API-Request automatisch angelegt (`CREATE TABLE IF NOT EXISTS`)

### Lokale Entwicklung

```bash
docker compose up -d
npm run dev
```
```

- [ ] **Step 3: Run full typecheck + tests as final verification**

```bash
npm run check && npm test
```
Expected: 0 errors, alle Tests pass.

- [ ] **Step 4: Commit**

```bash
git add DEPLOYMENT.md
git commit -m "docs: document postgres setup for railway and local dev"
```

---

## Self-Review Checklist (vor Übergabe)

- [ ] Alle 6 Spec-Abschnitte haben Tasks:
  - Abschnitt 1 (Datenmodell) → Task 3
  - Abschnitt 2 (API-Routen) → Tasks 9, 10
  - Abschnitt 3 (Berechnungslogik) → Tasks 4, 5, 6, 15
  - Abschnitt 4 (UI-Design) → Tasks 14, 16, 17, 18
  - Abschnitt 5 (DB-Anbindung) → Tasks 2, 3, 20
  - Abschnitt 6 (Fehlerbehandlung) → Tasks 9 (overlap/400), 10 (404), 15 (graceful DB-Ausfall), 16 (modal-Fehler)
- [ ] Keine Platzhalter, TBDs, oder „handle errors appropriately"-Phrasen
- [ ] Typ-Konsistenz: `VacationRow` identisch in `src/lib/server/vacations.ts` und `src/lib/api/vacations.ts`
- [ ] Funktionssignaturen matchen zwischen Definition (Task 4–6) und Aufrufen (Task 15, 17)
- [ ] TDD für Pure Functions (Tasks 4, 5, 6), Manual-Smoke-Tests für DB/API/UI (Tasks 9, 10, 15, 18)

## Reihenfolge-Übersicht

```
Task 1 (Vitest) → Task 2 (Docker) → Task 3 (DB-Client)
  → Task 4 → 5 → 6 (Pure Utils, TDD)
  → Task 7 (Query-Layer) → Task 8 (Auth) → Task 9 → 10 (API-Routen)
  → Task 11 (Client-Fetch) → Task 12 (Config) → Task 13 (Store)
  → Task 14 (Tile) → Task 15 (Dashboard) → Task 16 (Modal) → Task 17 (List) → Task 18 (Page)
  → Task 19 (Logout) → Task 20 (Deploy-Docs)
```
