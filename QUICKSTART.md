# 🚀 Quickstart Guide

## Sofort loslegen

### 1. Dependencies installieren

```bash
npm install
```

✅ Erfolgreich installiert! (114 packages)

### 2. Development Server starten

```bash
npm run dev
```

Die App läuft dann auf: **http://localhost:5173**

### 3. Beim ersten Start

1. **Clockify API Key holen:**
   - Gehe zu https://app.clockify.me/user/settings
   - Scrolle nach unten zu "API"
   - Kopiere deinen API Key

2. **In der App anmelden:**
   - Öffne http://localhost:5173
   - Gib deinen API Key ein
   - Klicke "Anmelden"

3. **Fertig!** 🎉
   - Das Dashboard zeigt deine Zeiten an
   - Passe unter "Einstellungen" dein Arbeitszeitmodell an

## 📱 Features

- ✅ **Tages-Übersicht**: Wie viele Stunden heute?
- ✅ **Wochen-Übersicht**: Gesamte Woche im Blick
- ✅ **Monats-Übersicht**: Monatliche Bilanz
- ✅ **Jahres-Übersicht**: Jahresübersicht
- ✅ **Soll/Ist-Vergleich**: Automatische Berechnung
- ✅ **Status-Farben**: Grün (Über-Soll), Gelb (Im Rahmen), Rot (Unter-Soll)
- ✅ **Mobile-optimiert**: Perfekt auf dem Smartphone
- ✅ **Auto-Refresh**: Automatische Aktualisierung alle 5 Minuten

## ⚙️ Einstellungen

Im Settings-Bereich kannst du konfigurieren:

- **Wochenstunden**: Standard 40h (anpassbar)
- **Arbeitstage**: Standard 5 Tage (anpassbar)
- **Wochenbeginn**: Montag oder Sonntag

Die App berechnet automatisch:
- Stunden pro Tag = Wochenstunden ÷ Arbeitstage
- Soll-Zeiten basierend auf Arbeitstagen (ohne Wochenenden)

## 🛠️ Scripts

```bash
# Development (mit Hot Reload)
npm run dev

# Production Build
npm run build

# Production Server lokal
npm start

# Type Check
npm run check
```

## 📦 Build für Production

```bash
# 1. Build erstellen
npm run build

# 2. Server starten
npm start
```

Die App läuft dann auf Port 3000 (oder `$PORT` Environment Variable).

## 🚢 Deployment

### Railway (empfohlen)

Siehe [DEPLOYMENT.md](./DEPLOYMENT.md) für detaillierte Anleitung.

**Kurzversion:**

1. Push zu GitHub
2. Railway Projekt erstellen
3. GitHub Repo verbinden
4. Automatisches Deployment! 🎉

### Andere Plattformen

- **Vercel**: Kompatibel mit SvelteKit Adapter
- **Netlify**: Node.js Environment erforderlich
- **Docker**: Dockerfile kann einfach erstellt werden

## 🔧 Troubleshooting

### Port bereits belegt?

```bash
# Dev Server auf anderem Port
npm run dev -- --port 5174
```

### Build Fehler?

```bash
# Node Modules neu installieren
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Fehler?

```bash
# Sync und Check
npm run check
```

### API Fehler?

- Prüfe API Key in Clockify Settings
- API Key darf keine Leerzeichen enthalten
- Workspace muss aktiviert sein

## 📚 Dokumentation

- **[README.md](./README.md)**: Projekt-Übersicht
- **[STRUKTUR.md](./STRUKTUR.md)**: Detaillierte Code-Struktur
- **[DEPLOYMENT.md](./DEPLOYMENT.md)**: Deployment-Anleitung
- **[Claude.md](./Claude.md)**: Original-Spezifikation

## 💡 Tipps

1. **Mobile nutzen**: Die App ist mobile-first designed
2. **Bookmark setzen**: Schneller Zugriff über Lesezeichen
3. **Home Screen**: Auf iOS/Android zum Home Screen hinzufügen
4. **Auto-Refresh**: Lass die App offen, sie aktualisiert automatisch

## 🎯 Nächste Schritte

1. ✅ Dependencies installiert
2. ✅ Dev Server gestartet
3. ⬜ API Key eingeben
4. ⬜ Einstellungen anpassen
5. ⬜ Dashboard nutzen
6. ⬜ Auf Railway deployen

---

**Viel Erfolg bei der Zeiterfassung! ⏱️**

Bei Fragen oder Problemen: Siehe Dokumentation oder erstelle ein GitHub Issue.
