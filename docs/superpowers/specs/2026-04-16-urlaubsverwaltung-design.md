# Urlaubsverwaltung — Design

**Status:** Alle Abschnitte abgenommen. Bereit für Implementation-Plan.

## Ziel

Langfristige Urlaubs-Persistenz (nicht nur localStorage) mit Kontingent-Tracking (25 Tage/Jahr), Integration in den bestehenden Soll/Ist-Vergleich und einer eigenen Verwaltungsseite.

## Entscheidungen (Übersicht)

| Thema | Entscheidung |
|-------|-------------|
| Eingabe | Manuell, Zeiträume (Von–Bis) |
| Granularität | Nur ganze Tage |
| Auswirkung auf Berechnung | Urlaub erhöht **Ist** um `hoursPerDay`, Soll unverändert |
| Verbrauchte Tage | Echte Arbeitstage (Mo–Fr, ohne Feiertage) |
| Urlaubskontingent | 25 Tage/Jahr (aus Config, kein DB-Eintrag) |
| Persistenz | PostgreSQL auf Railway |
| UI-Platzierung | Kachel im Dashboard + Seite `/urlaub` |

## 1. Datenmodell

```sql
CREATE TABLE IF NOT EXISTS vacations (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,        -- Clockify User-ID
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  note        TEXT,                 -- optional, z.B. "Sommerurlaub"
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vacations_user_date_idx
  ON vacations (user_id, start_date, end_date);
```

- Urlaubskontingent bleibt in der App-Config (kein DB-Eintrag)
- `user_id` kommt aus Clockify — kein eigenes Auth-System

## 2. API-Routen

```
POST   /api/vacations           Urlaub anlegen
GET    /api/vacations?year=YYYY Urlaube eines Jahres laden
DELETE /api/vacations/:id       Urlaub löschen
```

- **Auth:** Clockify-API-Key im Header (`X-Api-Key` oder `Authorization`). Server validiert gegen Clockify-API und erhält daraus die `user_id`.
- **Kein PUT/PATCH:** Ändern = löschen + neu anlegen.
- **GET-Filter:** `?year=2026` liefert alle Einträge, die das Jahr berühren (auch solche, die das Jahr nur teilweise überschneiden).

## 3. Berechnungslogik

### Urlaub in Soll/Ist

- Soll-Berechnung bleibt **unverändert** (Urlaubstag = Arbeitstag)
- Ist wird **erhöht** um `hoursPerDay` (z.B. 8h bei 40/5) pro verbrauchtem Urlaubstag im jeweiligen Zeitraum
- Dashboard zeigt die Zusammensetzung auf: z.B. `29:30h Clockify + 8h Urlaub = 37:30h`

### Verbrauchte Tage pro Eintrag

- Nutzt die bestehende `countWorkingDaysWithHolidays(start, end, state)` aus `src/lib/utils/holidays.ts`
- Zählt nur Mo–Fr **ohne** Feiertage im konfigurierten Bundesland
- Wochenend- und feiertags-überlagerte Tage werden nicht vom Kontingent abgezogen

### Jahresgrenze

- Ein Eintrag kann Jahres-übergreifend sein (z.B. 28.12.–05.01.)
- DB speichert ihn als einen Datensatz
- Tage-Zählung filtert pro Jahr: Beim Rechnen für Jahr `Y` wird der Zeitraum auf `[max(start, Jan 1 Y), min(end, Dec 31 Y)]` eingeschränkt
- Budget pro Jahr bleibt dadurch sauber getrennt

### Resturlaub-Anzeige (dreiteilig)

Für das angezeigte Jahr:
- **Genommen:** Summe verbrauchter Arbeitstage bis `today` (inkl.)
- **Geplant:** Summe verbrauchter Arbeitstage nach `today`
- **Verfügbar:** `25 - genommen - geplant` (kann negativ werden, siehe Abschnitt 6)

## 4. UI-Design

### Dashboard-Kachel

Position: Unterhalb der Perioden-Tabs (Tag/Woche/Monat/Jahr), oberhalb eventueller weiterer Inhalte.

Inhalt:
- Titel: „Urlaub {Jahr}"
- Drei Zahlen nebeneinander: **Genommen | Geplant | Verfügbar**
- Verfügbar wird rot dargestellt, wenn negativ
- Gesamte Kachel ist klickbar → navigiert zu `/urlaub`

### Verwaltungsseite `/urlaub`

- Header mit Titel und „Zurück"-Link zum Dashboard
- Button **„Urlaub hinzufügen"** oben → öffnet Modal
- Liste darunter, gruppiert nach Jahr (absteigend: 2026, 2025, …)
  - Jahres-Header mit Summe: „2026 — 15 Tage genommen, 5 Tage geplant"
  - Pro Eintrag: `Von–Bis`, Tage-Anzahl, Notiz, Lösch-Icon (🗑️)
  - Lösch-Bestätigung per `confirm()`

### Neu-Modal

Felder:
- Von-Datum (`<input type="date">`, required)
- Bis-Datum (`<input type="date">`, required, default = Von)
- Notiz (`<textarea>`, optional)

Live-Vorschau unter den Datumsfeldern:
- „→ 9 Arbeitstage (10 Werktage, davon 1 Feiertag)"
- Update bei jeder Datums-Änderung
- Bei ungültiger Range (Bis < Von): Fehler-Text statt Vorschau

Aktionen: Speichern / Abbrechen

## 5. DB-Anbindung

### Library

`postgres` (Porsager) — leichtgewichtig, Tagged-Template-Queries, eingebauter Connection-Pool.

### Modul-Struktur

- `src/lib/server/db.ts` — Singleton-Client, liest `DATABASE_URL` aus env
- `src/lib/server/vacations.ts` — Query-Funktionen (`listByYear`, `create`, `delete`, `checkOverlap`)
- Nur aus Server-Routes (`+server.ts`) importierbar (Standard-SvelteKit-Konvention)

### Schema-Init

- Funktion `initDb()` führt `CREATE TABLE IF NOT EXISTS ...` und `CREATE INDEX IF NOT EXISTS ...` aus
- Wird einmal beim ersten API-Request ausgeführt, durch Modul-Level-Promise gegen doppelte Parallel-Ausführung geschützt
- Zukünftige Schema-Änderungen kommen als weitere idempotente Statements (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`) im selben Init

### Lokale Entwicklung

- `docker-compose.yml` im Projekt-Root mit Postgres-Service (Postgres 16)
- `.env.local` mit `DATABASE_URL=postgres://postgres:postgres@localhost:5432/zeiterfassung`
- `.env.local` in `.gitignore`
- Workflow: `docker-compose up -d` → `npm run dev`

### Railway-Setup

- PostgreSQL-Addon im Railway-Projekt anlegen
- `DATABASE_URL` wird von Railway automatisch gesetzt (verlinkt mit App-Service)
- Bestehende Variablen (`CLOCKIFY_API_KEY` etc.) bleiben unverändert

## 6. Fehlerbehandlung

### Überlappende Einträge (POST)

- Server prüft: `WHERE user_id = $1 AND NOT (new.end_date < existing.start_date OR new.start_date > existing.end_date)`
- Bei Treffer: `409 Conflict` mit Body `{ error: "overlap", conflictsWith: {...} }`
- Modal zeigt inline-Fehler mit Hinweis auf den kollidierenden Eintrag

### Budget-Überschreitung

- **Keine** Server-seitige Ablehnung — Einträge werden akzeptiert
- Dashboard zeigt „Verfügbar: −5 Tage" in Rot (nutzt bestehendes `status: 'under'`-Styling)
- Grund: Legitime Fälle wie Resturlaub-Übertrag, Sonderurlaub, etc.

### DB-Ausfall

- Clockify-Kacheln und Urlaubs-Kachel laden **unabhängig** (separate Promises in `fetchTimeData`, kein `Promise.all` das eins das andere kippt)
- Bei Fehler in `GET /api/vacations`: Urlaubs-Kachel rendert Error-State mit Retry-Button („⚠️ Urlaubsdaten nicht verfügbar")
- Berechnungen in diesem Zustand: Ist = nur Clockify-Stunden (kein Urlaubs-Bonus)

### Standardfälle

| Fall | Reaktion |
|------|---------|
| `end_date < start_date` (Client) | Modal-Inline-Fehler, Speichern-Button disabled |
| `end_date < start_date` (Server) | `400 Bad Request` |
| DELETE mit nicht-existierender ID | `404 Not Found`, UI-Toast „Eintrag nicht mehr vorhanden", Liste neu laden |
| Clockify-Auth fehlt/ungültig | `401 Unauthorized`, UI leitet zum Login |
| Fehlende Pflichtfelder | `400 Bad Request` |

### Logging

- Server-Fehler via `console.error` → Railway sammelt stdout automatisch
- Kein dediziertes Error-Tracking (Sentry o.ä.) — YAGNI für diese Größenordnung

## Offene Punkte für Implementation-Plan

- Reihenfolge: DB-Setup → API-Routen → Berechnungs-Integration → UI-Kachel → `/urlaub`-Seite → Modal
- Tests: Query-Funktionen (Überlappung, Jahres-Splitting), Berechnungs-Integration (Ist-Bonus)
- Bestehenden `fetchTimeData`-Flow im Dashboard umbauen (parallel laden, aber voneinander entkoppelt)
