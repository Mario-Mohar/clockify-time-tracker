# Plesk + MariaDB Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zeiterfassung-App von Railway (Node + Postgres) auf den Linux-VPS mit Plesk (Node.js-Extension + MariaDB) migrieren, inkl. Daten-Übernahme. Subdomain: `timetracker.syventa.at`.

**Architecture:** SvelteKit-App bleibt unverändert auf `@sveltejs/adapter-node`. DB-Layer wird von `postgres` (Porsager) auf `mysql2/promise` umgestellt — gleiches Schema, MariaDB-kompatible Syntax, Pool-Connection, `dateStrings: true` für saubere YYYY-MM-DD-Strings. Keine ORM, keine Migrations-Library — wir behalten das idempotente `CREATE TABLE IF NOT EXISTS` aus `initDb()`. Plesk hostet Node-App via Phusion Passenger (Reverse-Proxy hinter dem vorhandenen Apache/Nginx-Vhost). Bestehender Datenbestand (1 Zeile) wird per `pg_dump` exportiert, manuell zu MySQL-INSERT konvertiert und über phpMyAdmin importiert.

**Tech Stack:** SvelteKit 2.x, Node 20, `mysql2` (kompatibel mit MariaDB-Wire-Protokoll), MariaDB ≥10.6 (Plesk-Default), Plesk Obsidian + Node.js-Extension + phpMyAdmin.

**Voraussetzungen / Annahmen:**
- Plesk-User hat Zugriff auf Domain `syventa.at` und kann Subdomains anlegen
- Node.js-Extension im Plesk installiert mit Node 20 verfügbar
- phpMyAdmin im Plesk verfügbar (Standard)
- DNS für `syventa.at` zeigt auf den VPS (Plesk legt Subdomain-A-Record automatisch an)
- Git-Remote des Repos erreichbar (für Plesk-Git-Deployment); falls nicht, Fallback auf manuellen Upload via File-Manager

---

## File Structure

**Modify:**
- `package.json` — `postgres` raus, `mysql2` rein
- `src/lib/server/db.ts` — Pool + `initDb()` auf MariaDB-Syntax umschreiben
- `src/lib/server/vacations.ts` — alle 5 Query-Funktionen von Tagged-Templates auf parametrisierte `mysql2`-Queries umschreiben
- `docker-compose.yml` — Postgres-Service durch MariaDB-Service ersetzen
- `DEPLOYMENT.md` — Railway-Anleitung durch Plesk-Anleitung ersetzen
- `.env.example` — vorhandene Postgres-URL durch MariaDB-URL ersetzen (Datei existiert bereits mit Railway-Hinweis)

**Create:**
- `migration/2026-05-04-vacations-railway-export.sql` — exportierte Daten von Railway, MariaDB-INSERT-Format (für phpMyAdmin-Import)

**Unchanged:**
- `src/lib/utils/vacation.test.ts` und alle anderen Pure-Calc-Tests — laufen weiter ohne DB
- `src/routes/api/vacations/**` — API-Schicht ist DB-agnostisch
- `src/lib/server/auth.ts` — kein DB-Bezug
- Alle UI-Komponenten

---

## Phase A — Code-Refactor lokal (Postgres → MariaDB)

### Task 1: Branch + lokales MariaDB hochfahren

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Feature-Branch erstellen**

```bash
git checkout -b feature/plesk-mariadb-migration
```

- [ ] **Step 2: `docker-compose.yml` auf MariaDB umstellen**

Ersetze den kompletten Inhalt von `docker-compose.yml`:

```yaml
services:
  mariadb:
    image: mariadb:11
    restart: unless-stopped
    environment:
      MARIADB_ROOT_PASSWORD: root
      MARIADB_DATABASE: zeiterfassung
      MARIADB_USER: zeiterfassung
      MARIADB_PASSWORD: zeiterfassung
    ports:
      - "3306:3306"
    volumes:
      - mariadb_data:/var/lib/mysql

volumes:
  mariadb_data:
```

- [ ] **Step 3: Alten Postgres-Container stoppen, neuen starten**

```bash
docker compose down -v
docker compose up -d
```

Erwartete Ausgabe: `Container <projekt>-mariadb-1 Started`

- [ ] **Step 4: Verbindung verifizieren**

```bash
docker compose exec mariadb mariadb -u zeiterfassung -pzeiterfassung -D zeiterfassung -e "SELECT VERSION();"
```

Erwartete Ausgabe: eine Versionszeile wie `11.x.x-MariaDB-...`

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: switch local docker-compose from postgres to mariadb"
```

---

### Task 2: `mysql2` installieren, `postgres` entfernen

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Pakete austauschen**

```bash
npm uninstall postgres
npm install mysql2@^3
```

- [ ] **Step 2: Verifizieren**

```bash
npm ls mysql2 postgres 2>&1 | head
```

Erwartete Ausgabe: `mysql2@3.x.x` aufgelistet, `postgres` nicht mehr.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: replace postgres with mysql2 for MariaDB"
```

---

### Task 3: `db.ts` auf `mysql2/promise` umschreiben

**Files:**
- Modify: `src/lib/server/db.ts`

- [ ] **Step 1: Datei komplett ersetzen**

Inhalt von `src/lib/server/db.ts`:

```ts
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
```

**Was hier zählt:**
- `dateStrings: true` → DATE-Spalten kommen als `'YYYY-MM-DD'` String, kein Date-Casting nötig
- `timezone: 'Z'` → keine implizite TZ-Konvertierung von `created_at`
- `CREATE INDEX IF NOT EXISTS` gibt's erst ab MariaDB 10.5 nicht überall — wir fangen `ER_DUP_KEYNAME` ab als idempotenter Fallback

- [ ] **Step 2: Lokal verifizieren (DB anlegen via initDb)**

`.env`-Datei lokal anlegen (falls nicht vorhanden):

```bash
echo 'DATABASE_URL=mysql://zeiterfassung:zeiterfassung@localhost:3306/zeiterfassung' > .env
```

Dann TypeScript-Check:

```bash
npm run check 2>&1 | tail -20
```

Erwartet: Keine TS-Fehler in `db.ts` (Fehler in `vacations.ts` sind erwartet, weil wir die noch nicht refactored haben).

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/db.ts
git commit -m "refactor(db): switch driver from postgres to mysql2 with MariaDB schema"
```

---

### Task 4: `vacations.ts` Queries auf `mysql2` umschreiben

**Files:**
- Modify: `src/lib/server/vacations.ts`

- [ ] **Step 1: Datei komplett ersetzen**

Inhalt von `src/lib/server/vacations.ts`:

```ts
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool, initDb } from './db';

export interface DbVacation extends RowDataPacket {
  id: number;
  user_id: string;
  start_date: string; // YYYY-MM-DD (dateStrings: true im Pool)
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

const SELECT_COLS =
  'id, user_id, start_date, end_date, note, created_at';

/**
 * Alle Einträge eines Users, die das Jahr berühren.
 */
export async function listByYear(userId: string, year: number): Promise<VacationRow[]> {
  await initDb();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const [rows] = await pool.query<DbVacation[]>(
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
  const [rows] = await pool.query<DbVacation[]>(
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
  const [rows] = await pool.query<DbVacation[]>(
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
  note: string | null
): Promise<VacationRow> {
  await initDb();
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO vacations (user_id, start_date, end_date, note)
     VALUES (?, ?, ?, ?)`,
    [userId, startDate, endDate, note]
  );
  const [rows] = await pool.query<DbVacation[]>(
    `SELECT ${SELECT_COLS} FROM vacations WHERE id = ?`,
    [result.insertId]
  );
  return rowToDto(rows[0]);
}

export async function remove(userId: string, id: number): Promise<boolean> {
  await initDb();
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM vacations WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
}
```

**Was hier zählt:**
- `pool.query<T>()` mit `?`-Platzhaltern statt Tagged-Templates
- `RETURNING` durch `INSERT` + `SELECT WHERE id = LAST_INSERT_ID` ersetzt (nutzt `result.insertId` aus `ResultSetHeader`)
- `to_char()` entfällt komplett — `dateStrings: true` im Pool macht das
- `result.affectedRows` statt `rows.count` für DELETE

- [ ] **Step 2: TypeScript-Check**

```bash
npm run check 2>&1 | tail -10
```

Erwartet: Keine Fehler.

- [ ] **Step 3: Bestehende Pure-Calc-Tests laufen lassen**

```bash
npm test 2>&1 | tail -20
```

Erwartet: Alle 14 Tests in `src/lib/utils/vacation.test.ts` PASS (die testen pure Logik, kein DB).

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/vacations.ts
git commit -m "refactor(vacations): rewrite queries for mysql2/MariaDB"
```

---

### Task 5: Lokaler Smoke-Test gegen MariaDB

**Files:** (keine — manueller Test)

- [ ] **Step 1: Dev-Server starten**

```bash
npm run dev
```

Server läuft auf `http://localhost:5173`. (In separatem Terminal weitermachen oder `run_in_background`.)

- [ ] **Step 2: Schema-Init via API triggern (POST braucht Auth → wir testen via curl mit fake API-Key)**

Erst checken, was `requireClockifyUserId` für eine Auth-Quelle nutzt:

```bash
grep -n "Clockify" src/lib/server/auth.ts | head
```

(Erwartet: liest API-Key aus Header `x-clockify-key` oder Cookie — siehe Code.)

- [ ] **Step 3: Browser-Smoke-Test**

Öffne `http://localhost:5173` im Browser, gib deinen Clockify-API-Key ein, geh auf `/urlaub` und:
1. Lege einen Test-Urlaub an (z.B. 2026-12-20 bis 2026-12-22, Notiz "smoke-test")
2. Prüfe, dass er in der Liste erscheint
3. Lösche ihn wieder

- [ ] **Step 4: Direkt in DB verifizieren (Schema + Daten)**

```bash
docker compose exec mariadb mariadb -u zeiterfassung -pzeiterfassung -D zeiterfassung -e "SHOW CREATE TABLE vacations\G"
```

Erwartet: Tabelle existiert mit allen Spalten und dem Index `vacations_user_date_idx`.

```bash
docker compose exec mariadb mariadb -u zeiterfassung -pzeiterfassung -D zeiterfassung -e "SELECT COUNT(*) FROM vacations;"
```

Erwartet: `0` (nach dem Lösch-Test).

- [ ] **Step 5: Dev-Server stoppen, kein Commit nötig**

(Smoke-Test erzeugt keine Code-Änderungen. Falls Probleme: zurück zu Task 3/4.)

---

## Phase B — Daten-Export von Railway aufbereiten

### Task 6: Railway-Daten als MariaDB-INSERT-SQL exportieren

**Files:**
- Create: `migration/2026-05-04-vacations-railway-export.sql`

- [ ] **Step 1: Verzeichnis erstellen**

```bash
mkdir -p migration
```

- [ ] **Step 2: Daten von Railway-Postgres holen**

> **Voraussetzung:** `$RAILWAY_DATABASE_URL` muss im Shell-Env gesetzt sein (in der Form `postgresql://USER:PASS@HOST:PORT/DB` aus dem Railway-Dashboard → Postgres-Service → Connect). Bewusst NICHT in den Plan committed.
>
> ```bash
> export RAILWAY_DATABASE_URL='postgresql://...'
> ```

```bash
docker run --rm -e PGURL="$RAILWAY_DATABASE_URL" postgres:16 \
  psql "$PGURL" \
  -c "SELECT id, user_id, to_char(start_date,'YYYY-MM-DD') AS start_date, to_char(end_date,'YYYY-MM-DD') AS end_date, COALESCE(note,'') AS note, to_char(created_at,'YYYY-MM-DD HH24:MI:SS') AS created_at FROM vacations ORDER BY id;"
```

Erwartet: 1 Zeile mit `id=1`, `user_id=68d3a9faa3dfb5757922d994`, `start_date=2026-07-29`, `end_date=2026-08-07`, leere Note. **Falls bis dahin neue Zeilen dazugekommen sind**, alle übernehmen.

- [ ] **Step 3: SQL-Datei schreiben**

Inhalt von `migration/2026-05-04-vacations-railway-export.sql` (mit den Werten aus Step 2 — falls neue Zeilen dazugekommen sind, mehrere INSERTs):

```sql
-- Daten-Export von Railway-Postgres → MariaDB
-- Stand: 2026-05-04
-- Quelle: trolley.proxy.rlwy.net:14302/railway, Tabelle vacations
-- Vor Import: Tabelle muss bereits via initDb() angelegt sein
--             (passiert beim ersten App-Start oder beim ersten API-Request)

INSERT INTO vacations (id, user_id, start_date, end_date, note, created_at) VALUES
  (1, '68d3a9faa3dfb5757922d994', '2026-07-29', '2026-08-07', NULL, '2026-04-18 09:31:03');

-- AUTO_INCREMENT-Counter auf next-id setzen, sodass künftige Inserts nicht kollidieren
ALTER TABLE vacations AUTO_INCREMENT = 2;
```

**Hinweis:** `note` war im Postgres leer; wir mappen leeren String zurück auf `NULL`, weil das Schema `note TEXT` (nullable) ist und die App `'' → null` normalisiert.

- [ ] **Step 4: Lokal-Probe-Import gegen lokale MariaDB**

```bash
docker compose exec mariadb mariadb -u zeiterfassung -pzeiterfassung -D zeiterfassung -e "DELETE FROM vacations; ALTER TABLE vacations AUTO_INCREMENT = 1;"
docker compose exec -T mariadb mariadb -u zeiterfassung -pzeiterfassung -D zeiterfassung < migration/2026-05-04-vacations-railway-export.sql
docker compose exec mariadb mariadb -u zeiterfassung -pzeiterfassung -D zeiterfassung -e "SELECT * FROM vacations;"
```

Erwartet: 1 Zeile, exakt wie der Export.

- [ ] **Step 5: Smoke-Test mit migrierten Daten**

```bash
npm run dev
```

Browser → API-Key eingeben → `/urlaub`: Eintrag 2026-07-29 bis 2026-08-07 muss erscheinen.

- [ ] **Step 6: Commit**

```bash
git add migration/
git commit -m "chore(migration): export vacations from railway as MariaDB SQL"
```

---

### Task 7: Push des Branches auf den Remote

**Files:** (keine)

- [ ] **Step 1: Branch pushen**

```bash
git push -u origin feature/plesk-mariadb-migration
```

(Wird in Phase C für Plesk-Git-Deployment gebraucht.)

---

## Phase C — Plesk-Server-Setup (UI-Klick-Anleitung)

> **Hinweis:** Diese Tasks führst du im Plesk-Webinterface aus. Jeder Task endet mit einer Verifikation, damit klar ist, ob er geklappt hat.

### Task 8: Subdomain `timetracker.syventa.at` in Plesk anlegen

**Files:** (keine)

- [ ] **Step 1: Plesk-UI öffnen → "Websites & Domains" → bei `syventa.at` auf "Subdomain hinzufügen"**

Eingabe:
- Subdomain-Name: `timetracker`
- Document-Root: `/timetracker.syventa.at` (Default belassen, Plesk schlägt das vor)
- "OK" klicken

- [ ] **Step 2: DNS verifizieren (sofern Plesk DNS-Manager nutzt, ist der A-Record automatisch gesetzt)**

Auf dem lokalen Rechner:

```bash
dig +short timetracker.syventa.at
```

Erwartet: VPS-IP. (Falls leer → ein paar Minuten warten oder im Plesk DNS-Manager den A-Record manuell anlegen.)

---

### Task 9: MariaDB-Datenbank + DB-User in Plesk anlegen

**Files:** (keine)

- [ ] **Step 1: Plesk → "Datenbanken" → "Datenbank hinzufügen"**

Eingabe:
- Datenbankname: `zeiterfassung`
- Verknüpfte Site: `timetracker.syventa.at`
- Datenbankserver: `localhost` (Default, MariaDB)
- Neuer Datenbankbenutzer:
  - Benutzername: `zeiterfassung`
  - Passwort: **Plesk's Passwort-Generator nutzen, mind. 24 Zeichen** — speichern (1Password / Bitwarden)
- "OK" klicken

- [ ] **Step 2: phpMyAdmin öffnen → links Datenbank `zeiterfassung` auswählen → Tab "Privilegien"**

Verifizieren: `zeiterfassung@localhost` hat ALL PRIVILEGES auf der DB. (Plesk macht das automatisch — nur prüfen.)

- [ ] **Step 3: Notiere die Verbindungsdaten**

```
DATABASE_URL=mysql://zeiterfassung:<PASSWORD>@localhost:3306/zeiterfassung
```

(Plesk-MariaDB läuft per Default auf Port 3306 lokal — kein Public-Port. Wird in Task 11 als Env-Variable gesetzt.)

---

### Task 10: Node.js-App im Plesk-Toolkit konfigurieren

**Files:** (keine — Plesk-UI)

- [ ] **Step 1: Plesk → bei `timetracker.syventa.at` auf "Node.js"**

Konfiguration:
- Node.js-Version: **20.x** (höchste verfügbare 20er)
- Package Manager: `npm`
- Document Root: `/timetracker.syventa.at` (Default)
- Application Root: `/timetracker.syventa.at` (Default)
- Application Mode: `production`
- Application Startup File: `build/index.js`
- Application URL: `https://timetracker.syventa.at`

"Anwenden" klicken — Plesk legt jetzt das Verzeichnis-Skeleton an und startet einen Passenger-Prozess (der initial fehlschlägt, weil noch kein Code da ist — egal).

- [ ] **Step 2: Custom-Environment-Variable setzen**

In der Node.js-Sektion → "Custom environment variables":
- `DATABASE_URL` = `mysql://zeiterfassung:<PASSWORD>@localhost:3306/zeiterfassung` (aus Task 9)
- `NODE_ENV` = `production`
- `ORIGIN` = `https://timetracker.syventa.at` (für SvelteKit Origin-Check)

"Anwenden" klicken.

---

### Task 11: Code auf den Server bringen + Build

**Files:** (keine — Plesk-UI / Git)

**Variante A — Plesk Git-Extension (bevorzugt, falls Repo erreichbar):**

- [ ] **Step 1A: Plesk → bei `timetracker.syventa.at` auf "Git" → "Repository hinzufügen"**

- Repository-URL: <eure Repo-URL>
- Branch: `feature/plesk-mariadb-migration`
- Deployment-Pfad: `/timetracker.syventa.at` (Application Root)
- Deployment-Modus: "Manuell" (erstmal — auf Auto umschalten nach erfolgreichem Test)
- Bei Bedarf SSH-Key generieren und im Repo als Deploy-Key hinterlegen

- [ ] **Step 2A: "Pull updates" klicken** → Code landet im Application Root.

**Variante B — Manueller Upload (falls Git nicht praktikabel):**

- [ ] **Step 1B: Lokal Build erzeugen**

```bash
npm run build
```

- [ ] **Step 2B: Tarball schnüren (ohne node_modules, ohne .git)**

```bash
tar --exclude='node_modules' --exclude='.git' --exclude='.svelte-kit' \
  -czf /tmp/timetracker.tar.gz .
```

- [ ] **Step 3B: Plesk → "Dateien" für `timetracker.syventa.at` → Upload `/tmp/timetracker.tar.gz` → Rechtsklick → "Extrahieren"**

**Beide Varianten — gemeinsamer Abschluss:**

- [ ] **Step 3: NPM Install via Plesk**

Plesk → Node.js-Sektion → "NPM Install" klicken.

Erwartet: Output endet mit "added N packages".

- [ ] **Step 4: Build via Plesk Run-Script**

Plesk → Node.js-Sektion → "Run script" → Script `build` auswählen → Ausführen.

Erwartet: Vite-Build-Output, endet mit "✓ built in Xs".

- [ ] **Step 5: App starten**

Plesk → Node.js-Sektion → "Restart App" klicken.

- [ ] **Step 6: Erste Verifikation (HTTP)**

```bash
curl -I http://timetracker.syventa.at
```

Erwartet: `HTTP/1.1 200` oder `HTTP/1.1 302` (SvelteKit Redirect zur Setup-Seite). NICHT `502` oder `503`.

Bei `502`: Plesk → Node.js-Sektion → "Logs" prüfen. Häufige Ursachen: falscher Startup-File, Port-Binding-Fehler, fehlende Env-Variablen.

---

### Task 12: SSL via Let's Encrypt aktivieren

**Files:** (keine)

- [ ] **Step 1: Plesk → bei `timetracker.syventa.at` → "SSL/TLS-Zertifikate" → "Let's Encrypt installieren"**

- E-Mail: deine
- Domain: `timetracker.syventa.at` ankreuzen
- "WWW"-Variante auch ankreuzen, wenn Plesk vorschlägt
- "Hole es"

- [ ] **Step 2: HTTPS-Redirect aktivieren**

Plesk → "Hosting-Einstellungen" → "Permanente SEO-sichere 301-Umleitung von HTTP zu HTTPS" aktivieren.

- [ ] **Step 3: HTTPS-Verifikation**

```bash
curl -I https://timetracker.syventa.at
```

Erwartet: `HTTP/2 200` (oder Redirect zur Setup-Seite mit gültigem Zertifikat).

---

## Phase D — Daten-Import & Cutover

### Task 13: SQL-Dump in Plesk-MariaDB importieren

**Files:** (keine — phpMyAdmin)

- [ ] **Step 1: App einmal aufrufen, damit `initDb()` die Tabelle anlegt**

```bash
curl https://timetracker.syventa.at/urlaub
```

(Auch wenn die Antwort eine SvelteKit-Seite ist — das `/urlaub`-Endpoint führt beim Server-Render irgendwann eine DB-Query aus, die `initDb()` triggert.)

Falls das nicht reicht, alternativ via Browser einmal mit API-Key einloggen und `/urlaub` öffnen. Oder: SQL-Schema händisch in phpMyAdmin pasten — siehe `src/lib/server/db.ts:initDb`.

- [ ] **Step 2: Verifizieren, dass Tabelle existiert**

phpMyAdmin → DB `zeiterfassung` → Tabelle `vacations` muss in der Liste auftauchen, leer.

- [ ] **Step 3: SQL-Datei importieren**

phpMyAdmin → DB `zeiterfassung` → Tab "Importieren" → Datei `migration/2026-05-04-vacations-railway-export.sql` von lokal hochladen → "OK".

Erwartet: "Import erfolgreich, X Anweisungen ausgeführt."

- [ ] **Step 4: Verifizieren**

phpMyAdmin → Tabelle `vacations` → "Anzeigen" → 1 Zeile, Daten passen zum Railway-Export.

---

### Task 14: End-to-End-Smoke-Test auf der Live-Subdomain

**Files:** (keine)

- [ ] **Step 1: Browser → `https://timetracker.syventa.at`**

- API-Key eingeben (deinen Clockify-Key)
- Dashboard lädt → bestehender Urlaubseintrag (29.07.–07.08.2026) ist sichtbar
- `/urlaub` öffnen → Liste enthält denselben Eintrag

- [ ] **Step 2: Schreib-Test**

- Neuen Test-Urlaub anlegen (z.B. 2026-12-23 bis 2026-12-24, Notiz "live-smoke")
- Reload → Eintrag bleibt
- Wieder löschen

- [ ] **Step 3: Vergleich mit Railway**

- Parallel zum alten Railway-URL navigieren
- Beide zeigen denselben Bestand (vom Stichtag des Exports — neue Live-Einträge nur auf Plesk)

**Wenn alles passt:** Cutover ist erfolgreich. Wenn nicht: Plesk-Logs analysieren, Railway läuft weiter als Fallback.

---

### Task 15: Railway abschalten

**Files:** (keine)

> **Achtung:** Erst nach erfolgreichem Smoke-Test (Task 14)! Danach gibt es kein Rollback ohne Daten-Verlust.

- [ ] **Step 1: Finalen Daten-Diff prüfen**

Falls nach dem Export in Task 6 noch neue Einträge auf Railway entstanden sind (unwahrscheinlich, weil keiner aktiv genutzt hat):

```bash
docker run --rm -e PGURL="$RAILWAY_DATABASE_URL" postgres:16 \
  psql "$PGURL" -c "SELECT COUNT(*) FROM vacations;"
```

Erwartet: gleicher Count wie zuvor (1). Falls höher → erst diese Zeilen auch nach MariaDB übertragen, dann weitermachen.

- [ ] **Step 2: Railway-Service abschalten**

Im Railway-Dashboard:
- Projekt öffnen → "Settings" → "Delete Project"
  
  ODER (sanfter, falls du Logs/Metrics behalten willst):
- Service auf "Pause" stellen + Postgres-Service löschen

- [ ] **Step 3: Credentials rotieren / dokumentieren**

Nach Service-Lösch sind die Postgres-Credentials wertlos. Trotzdem: in lokaler Chat-Historie/Notizen entfernen.

---

### Task 16: Repo aufräumen — Dokumentation + Branch mergen

**Files:**
- Modify: `DEPLOYMENT.md`, `Claude.md` (falls vorhanden), `README.md` (falls Railway-Hinweise drin)

- [ ] **Step 1: `DEPLOYMENT.md` neu schreiben**

Ersetze den kompletten Inhalt durch eine Plesk-Anleitung. Mindestinhalt:

```markdown
# Deployment Guide

## Plesk (Production: timetracker.syventa.at)

### Stack
- Plesk Obsidian + Node.js-Extension (Phusion Passenger)
- Node 20.x
- MariaDB (Plesk-default, lokal auf 3306)
- SvelteKit `@sveltejs/adapter-node`, Startup: `build/index.js`

### Initial-Setup (einmalig)
Siehe `docs/superpowers/plans/2026-05-04-plesk-mariadb-migration.md`,
Phasen C+D für die komplette Klick-Anleitung.

### Updates deployen
1. Lokal: Branch nach `master` mergen, push
2. Plesk → "Git" für `timetracker.syventa.at` → "Pull updates"
3. Plesk → "Node.js" → "NPM Install" (nur wenn package.json sich geändert hat)
4. Plesk → "Node.js" → "Run script" → `build`
5. Plesk → "Node.js" → "Restart App"

### Lokale Entwicklung
docker compose up -d   # MariaDB lokal
npm install
npm run dev
```

- [ ] **Step 2: Falls `README.md` Railway erwähnt → entfernen**

```bash
grep -n -i "railway" README.md QUICKSTART.md PROJECT_SUMMARY.md Claude.md 2>/dev/null
```

Jeden Treffer durchgehen und durch Plesk/MariaDB-Hinweis ersetzen oder löschen.

- [ ] **Step 3: `railway.json` und `Procfile` löschen**

```bash
git rm railway.json Procfile
```

(Werden auf Plesk nicht gebraucht.)

- [ ] **Step 4: Tests + Type-Check ein letztes Mal**

```bash
npm run check && npm test
```

Erwartet: alles grün.

- [ ] **Step 5: Commit**

```bash
git add DEPLOYMENT.md README.md QUICKSTART.md PROJECT_SUMMARY.md Claude.md
git commit -m "docs: replace Railway deployment docs with Plesk + MariaDB guide"
```

- [ ] **Step 6: Branch in `master` mergen**

```bash
git checkout master
git merge --no-ff feature/plesk-mariadb-migration -m "Merge feature/plesk-mariadb-migration: VPS deployment with MariaDB"
git push origin master
```

- [ ] **Step 7: In Plesk auf master umstellen**

Plesk → "Git" für `timetracker.syventa.at` → Branch ändern auf `master` → "Pull updates".
Optional: Deployment-Modus auf "Automatisch" (deployt bei jedem Push).

---

## Self-Review

**Spec coverage:**
- Code-Refactor Postgres → MariaDB → Tasks 2–4 ✓
- Lokale Verifikation → Task 5 ✓
- Daten-Migration (Export + Aufbereitung + Import) → Tasks 6, 13 ✓
- Plesk Subdomain + DB + Node-App + SSL → Tasks 8–12 ✓
- Cutover + Railway-Abschaltung → Tasks 14–15 ✓
- Doku-Aktualisierung → Task 16 ✓
- Subdomain `timetracker.syventa.at` → Tasks 8, 10, 12 ✓

**Bekannte Risiken / Stolperfallen, die der Engineer beachten muss:**
1. **Passenger und SvelteKit `adapter-node`:** `adapter-node` startet einen eigenen Server, der `PORT` aus env liest. Passenger setzt `PORT` automatisch — sollte gehen, aber falls nicht, in Plesk-Logs schauen, ob das Binding klappt.
2. **`ORIGIN`-Env:** SvelteKit `adapter-node` lehnt POST-Requests ohne passenden Origin ab. Falls 403 bei POST → `ORIGIN`-Env nochmal prüfen (Task 10 Step 2).
3. **`initDb()`-Race:** Beim allerersten Request läuft das `CREATE TABLE` parallel — `IF NOT EXISTS` macht das idempotent, kein Race.
4. **MariaDB-Version <10.5:** `CREATE INDEX IF NOT EXISTS` gibt's nicht — wir fangen `ER_DUP_KEYNAME` ab (Task 3). Sollte safe sein für alle Plesk-Versionen.
5. **`note` leerer String vs NULL:** App speichert `''` als `NULL` (siehe `+server.ts:41`). SQL-Export setzt das konsequent auf `NULL`.
6. **mysql2 Idle-Connection-Reaping unter Phusion Passenger:** Default mysql2-Pool evictet Idle-Connections nicht. Plesk-Passenger kann mehrere Worker-Prozesse spawnen → potenziell viele Idle-Sockets vs. MariaDB `wait_timeout` (Default 28800s). Falls nach Cutover sporadische `PROTOCOL_CONNECTION_LOST`-Errors auftauchen → in `db.ts` ergänzen: `idleTimeout: 60000, maxIdle: 2`. Nicht präventiv setzen — erst observen.

**Type consistency:** `pool` (statt `sql`), `RowDataPacket`/`ResultSetHeader` korrekt aus `mysql2` typisiert, `result.insertId` und `result.affectedRows` einheitlich verwendet, `DbVacation` in beiden Files identisch typisiert.

**Keine Placeholders gefunden.**

---

## Execution Handoff

Der Plan steht. Es gibt zwei Wege, ihn auszuführen:

1. **Subagent-Driven (empfohlen für Phase A — Code-Refactor):** Pro Task ein frischer Subagent, dazwischen Review. Sauber, schnell, gut für TDD-artige Tasks.
2. **Inline (besser für Phasen C+D):** Manuelle Plesk-Klicks musst sowieso DU machen — da bringt ein Subagent nichts.

**Vorschlag:** Phase A (Tasks 1–7) mit Subagent-Driven oder inline ausführen, dann Phasen C/D zusammen am Plesk durchklicken (ich begleite Step-by-Step), Task 16 wieder regulär committen lassen.
