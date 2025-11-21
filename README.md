# Clockify Working Time Tracker

Eine minimalistische, mobile-first Webapp zur Zeiterfassung mit Clockify API.

## Features

- 📊 Soll/Ist-Zeitvergleich (Tag, Woche, Monat, Jahr)
- 📱 Mobile-optimiert
- 🎨 Minimalistisches Design
- 🔒 Sichere API-Key Speicherung
- ⚡ Schnell und reaktiv

## Quick Start

```bash
# Dependencies installieren
npm install

# Development Server starten
npm run dev

# Production Build
npm run build

# Production Server starten
npm start
```

## Konfiguration

1. Clockify API Key holen von: https://app.clockify.me/user/settings
2. In der App unter "Settings" eingeben
3. Arbeitszeitmodell konfigurieren (Standard: 40h/Woche, 5 Tage)

## Deployment auf Railway

1. Repository mit GitHub verbinden
2. Railway Projekt erstellen: "Deploy from GitHub"
3. Environment Variable setzen (optional): `CLOCKIFY_API_KEY`
4. Automatisches Deployment bei jedem Push

## Technologie-Stack

- **Frontend**: SvelteKit 2
- **UI**: Mobile-first CSS
- **API**: Clockify REST API
- **Deployment**: Railway (Node.js Adapter)

## Projektstruktur

```
src/
├── lib/
│   ├── api/
│   │   └── clockify.ts       # Clockify API Client
│   ├── stores/
│   │   ├── config.ts          # Arbeitszeitkonfiguration
│   │   └── auth.ts            # API-Key Management
│   ├── utils/
│   │   └── calculations.ts    # Soll/Ist Berechnungen
│   └── components/
│       ├── Dashboard.svelte   # Hauptansicht
│       ├── Settings.svelte    # Einstellungen
│       └── Login.svelte       # API-Key Eingabe
└── routes/
    └── +page.svelte           # Main Entry Point
```

## Lizenz

MIT
