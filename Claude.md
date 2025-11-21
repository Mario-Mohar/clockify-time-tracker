# Claude.md

## Projekt: Clockify Working-Time Webapp

### Überblick
Eine minimalistische Webapp, die via Clockify-API die gebuchten Zeiten abruft und mit der Sollarbeitszeit (pro Woche/Monat/Jahr) abgleicht. Ziel ist eine klare Übersicht über:
- Sollzeiten basierend auf einem konfigurierbaren Arbeitsvertrag (Standard: 40h/Woche bei 5 Tagen)
- Ist-Zeiten laut Clockify
- Restarbeitszeit ("Was fehlt noch?")

Die App soll vollständig responsive sein, besonders optimiert für Smartphones.

---
## Anforderungen
### Funktional
1. **Clockify-Anbindung:**
   - Authentifizierung über API-Key
   - Abruf der Time Entries pro Woche/Monat/Jahr
   - Mapping auf User-Projekt(e) oder Workspace

2. **Sollzeit-Konfiguration:**
   - Eingabe von Wochenstunden (Standard: 40h)
   - Konfiguration Anzahl Arbeitstage/Woche (Standard: 5)
   - Optional: Feiertage / Urlaubstage (später erweiterbar)

3. **Berechnungen:**
   - Tages-, Wochen-, Monats- und Jahres-Sollzeit
   - Vergleich mit Clockify-Daten
   - Ermittlung Restarbeitszeit

4. **UI/UX (minimalistisch):**
   - Smartphone-first Design
   - Klarer Fokus: "Wie viel fehlt mir noch?"
   - Farbliche Hervorhebung:
     - Grün = Über Soll
     - Gelb = Im Rahmen
     - Rot = Unter Soll

5. **Technologien (Vorschlag):**
   - Frontend: SvelteKit oder Nuxt (mobile UX sehr gut handhabbar)
   - Backend: kleine API-Schicht in Node.js oder direkt clientseitig via Clockify-API (mit Vorsicht beim API-Key)
   - Auth: lokal gesichert, API-Key encrypted speichern

---
## Architektur
### Datenfluss
User → Konfiguration (Sollzeit) → Webapp → Clockify API → Zeitdaten → Berechnung → UI

### Komponenten
- **Config Store**: Speichert Arbeitsvertrag, Tage/Woche, Wochenstunden
- **Clockify Client**: Holen der Einträge
- **Calculation Engine**: Vergleicht Soll/Ist
- **UI Components**: Mobile Dashboard, Einstellungen, Verlauf

---
## API-Routen (falls Backend)
- `/api/clockify/timeentries?from=&to=` → gibt aggregierte Zeiten zurück
- `/api/config` → Persistenz der Sollzeiten

---
## Datenmodell
### Beispiel Config
```
{
  "weeklyHours": 40,
  "workDays": 5,
  "startOfWeek": "monday"
}
```

### Beispiel Aggregation Clockify
```
{
  "range": "2025-W47",
  "loggedHours": 32.5,
  "requiredHours": 40,
  "difference": -7.5
}
```

---
## Minimaler UI‑Flow
1. Login‑Screen: Clockify API Key eingeben
2. Dashboard:
   - X h Soll heute
   - X h gebucht heute
   - Differenz
3. Tabs für Woche/Monat/Jahr
4. Einstellungen für Arbeitszeitmodell

---
## ToDo für Claude Code
- Projekt scaffolden (SvelteKit oder Nuxt)
- Komponenten erzeugen
- Clockify API Wrapper Code generieren
- Berechnungslogik implementieren
- Settings-UI
- Mobile CSS/Layout erstellen

## Deployment auf Railway über GitHub

### Ziel
Das Projekt soll automatisch auf Railway (railway.com) deployed werden, sobald neue Commits im GitHub-Repository ankommen.

### Voraussetzungen
- GitHub-Repository eingerichtet
- Railway-Account vorhanden
- Railway CLI optional für lokale Tests
- Projekt wird als Node.js-App (SvelteKit/Nuxt) verstanden

### Schritte
1. **Railway-Projekt anlegen**
   - Neues Projekt erstellen
   - "Deploy from GitHub" wählen
   - Repository verbinden
   - Railway erstellt automatisch Deployments bei jedem `main`- oder konfigurierten Branch-Push

2. **Environment Variables setzen**
   - In Railway: `CLOCKIFY_API_KEY`
   - Optionale Variablen: `NODE_ENV=production`

3. **Build & Start Commands**
   Railway erkennt Node.js automatisch, dennoch sollte in `package.json` stehen:
   - `"build": "vite build"` (SvelteKit) oder `"build": "nuxt build"`
   - `"start": "node build/index.js"` bzw. `"start": "node .output/server/index.mjs"`

4. **Railway Plugin für SvelteKit / CSR**
   - Bei SvelteKit: Adapter Node verwenden:
     ```
     npm i -D @sveltejs/adapter-node
     ```
     In `svelte.config.js`:
     ```js
     import adapter from '@sveltejs/adapter-node';

     export default {
       kit: {
         adapter: adapter(),
       }
     };
     ```
     Dadurch kann Railway die App wie einen regulären Node-Server starten.

5. **GitHub → Railway Auto Deploy**
   - Railway baut jedes Mal neu
   - Logs & Domains werden automatisch erzeugt
   - Produktionsdomain kann sofort genutzt werden

### Empfehlung
- Für API-Key Sicherheit: Railway Variablen nutzen, niemals `.env` pushen
- Optional: Staging-Branch → Staging-Environment auf Railway

---

# Masterprompt für Claude Code

Du bist ein spezialisierter Entwicklungsagent. Das Projekt nutzt die Datei `Claude.md` als vollständige Grundlage. Lies alle Abschnitte und generiere daraus:

1. den gesamten Quellcode der Webapp
2. die Projektstruktur
3. alle notwendigen Konfigurationsdateien
4. API-Wrapper und Berechnungslogiken
5. UI-Komponenten (mobil‑optimiert)

Arbeite streng nach folgendem Ablauf:
- Analysiere zuerst die Datei `Claude.md`
- Plane die Ordnerstruktur
- Implementiere Schritt für Schritt
- Starte bei Bedarf mehrere Claude Code Agents für: Backend, Frontend, UI/UX, Berechnungslogik, API-Integration
- Halte alle Exporte reproduzierbar und kommentiert

Wichtig:
- Fokus auf minimalistisches, sauberes Design
- Mobile‑first
- Berechnungen müssen exakt der Beschreibung der Soll-/Ist‑Daten folgen
- Clockify API sauber kapseln

Output immer als fertige Datei- und Code-Strukturen. Arbeite deterministisch und modular, damit ich es direkt in VS Code einsetzen kann.

