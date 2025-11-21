# Projektstruktur

## Übersicht

```
Zeiterfassung/
├── src/
│   ├── lib/
│   │   ├── api/
│   │   │   └── clockify.ts          # Clockify API Client
│   │   ├── stores/
│   │   │   ├── auth.ts               # Authentifizierungs-Store
│   │   │   └── config.ts             # Konfigurations-Store
│   │   ├── utils/
│   │   │   └── calculations.ts       # Berechnungslogik
│   │   ├── components/
│   │   │   ├── Dashboard.svelte      # Hauptansicht
│   │   │   ├── Login.svelte          # Login-Komponente
│   │   │   └── Settings.svelte       # Einstellungen
│   │   └── index.ts                  # Library Exports
│   ├── routes/
│   │   ├── settings/
│   │   │   └── +page.svelte          # Settings-Seite
│   │   ├── +layout.svelte            # Root Layout
│   │   └── +page.svelte              # Hauptseite
│   ├── app.d.ts                      # TypeScript Deklarationen
│   ├── app.css                       # Globale Styles
│   ├── app.html                      # HTML Template
│   └── hooks.server.ts               # Server Hooks
├── static/
│   └── favicon.png                   # Favicon
├── .env                              # Environment Variables (nicht committen!)
├── .env.example                      # Beispiel Environment Variables
├── .gitignore                        # Git Ignore
├── .nvmrc                            # Node Version
├── package.json                      # Dependencies & Scripts
├── svelte.config.js                  # SvelteKit Config
├── vite.config.js                    # Vite Config
├── tsconfig.json                     # TypeScript Config
├── railway.json                      # Railway Config
├── Procfile                          # Railway/Heroku Procfile
├── README.md                         # Projekt-Dokumentation
├── DEPLOYMENT.md                     # Deployment-Anleitung
└── Claude.md                         # Projekt-Spezifikation
```

## Module

### 1. API Client (`src/lib/api/clockify.ts`)

**Zweck**: Kommunikation mit der Clockify REST API

**Hauptklassen**:
- `ClockifyClient`: API Client mit Methoden für:
  - User-Authentifizierung
  - Workspace-Verwaltung
  - Time Entries abrufen
  - Zeitberechnungen

**Key Features**:
- ISO 8601 Duration Parsing
- API Key Validierung
- Error Handling
- Typsichere Interfaces

### 2. Berechnungslogik (`src/lib/utils/calculations.ts`)

**Zweck**: Soll/Ist-Zeitberechnung basierend auf Arbeitszeitmodell

**Hauptfunktionen**:
- `calculateRequiredToday()`: Soll-Stunden für heute
- `calculateRequiredWeek()`: Soll-Stunden für Woche
- `calculateRequiredMonth()`: Soll-Stunden für Monat
- `calculateRequiredYear()`: Soll-Stunden für Jahr
- `compareXxxHours()`: Vergleich Soll/Ist mit Status
- `formatHours()`: Stunden formatieren (8:30h)
- `countWorkingDays()`: Arbeitstage zählen (ohne Wochenenden)

**Features**:
- Wochenend-Erkennung
- Flexible Arbeitszeitmodelle
- Status-Berechnung (over/good/under)

### 3. Stores

#### Auth Store (`src/lib/stores/auth.ts`)

**Zweck**: Authentifizierung und User Session

**State**:
- `apiKey`: Clockify API Key
- `user`: Aktueller User
- `workspace`: Aktiver Workspace
- `isAuthenticated`: Boolean
- `isLoading`: Boolean
- `error`: Fehlermeldung

**Methoden**:
- `setApiKey()`: API Key setzen und validieren
- `logout()`: Abmelden und Daten löschen
- `clearError()`: Fehler zurücksetzen

**Persistenz**: LocalStorage

#### Config Store (`src/lib/stores/config.ts`)

**Zweck**: Arbeitszeitmodell konfigurieren

**State**:
- `weeklyHours`: Wochenstunden (default: 40)
- `workDaysPerWeek`: Arbeitstage (default: 5)
- `startOfWeek`: Wochenbeginn (monday/sunday)

**Methoden**:
- `setWeeklyHours()`, `setWorkDays()`, `setStartOfWeek()`
- `setConfig()`: Komplette Config setzen
- `reset()`: Auf Standardwerte zurücksetzen

**Persistenz**: LocalStorage

### 4. Komponenten

#### Login (`src/lib/components/Login.svelte`)

**Features**:
- API Key Eingabe
- Validierung
- Error Handling
- Responsive Design
- Link zu Clockify Settings

#### Dashboard (`src/lib/components/Dashboard.svelte`)

**Features**:
- Tabs: Tag, Woche, Monat, Jahr
- Soll/Ist-Vergleich
- Status-Anzeige (Farben)
- Auto-Refresh (5 Min)
- Logout-Button
- Aktualisieren-Button

**Status-Farben**:
- 🟢 Grün (`over`): ≥ 1h Überstunden
- 🔵 Blau (`good`): ±1h im Rahmen
- 🔴 Rot (`under`): ≥ 1h fehlend

#### Settings (`src/lib/components/Settings.svelte`)

**Features**:
- Wochenstunden konfigurieren
- Arbeitstage konfigurieren
- Wochenbeginn wählen
- Berechnung Stunden/Tag
- Einstellungen speichern/zurücksetzen
- Logout (Danger Zone)

### 5. Routes

#### `+page.svelte` (Root)

Zeigt Login oder Dashboard basierend auf `$isAuthenticated`

#### `settings/+page.svelte`

Settings-Seite mit Auth-Guard (Redirect zu `/` wenn nicht authenticated)

## Datenfluss

```
1. User gibt API Key ein (Login)
   ↓
2. Auth Store validiert Key mit Clockify API
   ↓
3. User & Workspace werden geladen
   ↓
4. Dashboard lädt Time Entries via ClockifyClient
   ↓
5. Berechnungslogik vergleicht mit Config Store
   ↓
6. UI zeigt Ergebnis (Status-Farben)
```

## Technologie-Stack

- **Frontend**: SvelteKit 2 (Svelte 5)
- **Sprache**: TypeScript
- **Build Tool**: Vite
- **Date Utils**: date-fns
- **Styling**: Scoped CSS (Svelte)
- **State**: Svelte Stores (writable/derived)
- **Routing**: SvelteKit File-based Routing
- **Deployment**: Railway (Node.js Adapter)

## Best Practices

### 1. Type Safety
Alle API-Responses und Funktionen sind typisiert

### 2. Error Handling
- Try-Catch in API Calls
- User-freundliche Fehlermeldungen
- Error States in UI

### 3. Persistenz
- LocalStorage für Auth & Config
- Automatisches Laden beim Start
- Kein Server-seitiger State

### 4. Performance
- Parallele API Calls (Promise.all)
- Auto-Refresh (5 Min)
- Optimierte Bundle Size

### 5. Mobile-First
- Responsive Breakpoints
- Touch-optimierte Buttons
- Viewport Meta Tags

### 6. Security
- API Key nur im Client
- Keine Credentials im Code
- .env.example für Template

## Development

```bash
# Install
npm install

# Dev Server
npm run dev

# Type Check
npm run check

# Build
npm run build

# Preview Production
npm start
```

## Erweiterungsmöglichkeiten

### Geplant für später:
1. **Feiertage**: Integration von Feiertags-API
2. **Urlaubstage**: Manuell erfassen und berücksichtigen
3. **Notizen**: Zu einzelnen Tagen
4. **Export**: CSV/PDF-Reports
5. **Charts**: Visualisierung über Zeit
6. **Dark Mode**: Theme Switcher
7. **PWA**: Offline-Funktionalität
8. **Notifications**: Push bei Soll-Unterschreitung

### Architektur für Erweiterungen:
- **Plugins**: Eigene Module in `src/lib/plugins/`
- **Hooks**: Event System für Erweiterungen
- **API**: RESTful Backend für erweiterte Features
