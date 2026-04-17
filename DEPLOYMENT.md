# Deployment Guide

## Railway Deployment

Diese App ist optimiert für Deployment auf Railway.app.

### Voraussetzungen

- GitHub Repository
- Railway Account (https://railway.app)
- Node.js 18+ lokal (für Tests)

### Schritte

1. **GitHub Repository vorbereiten**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Railway Projekt erstellen**
   - Gehe zu https://railway.app
   - Klicke "New Project"
   - Wähle "Deploy from GitHub repo"
   - Autorisiere Railway für GitHub
   - Wähle dein Repository

3. **Environment Variables (Optional)**

   Railway erkennt automatisch Node.js und baut das Projekt.

   Optional kannst du setzen:
   - `NODE_ENV=production`
   - `CLOCKIFY_API_KEY=xxx` (für Pre-Configuration)

4. **Automatisches Deployment**

   Railway baut und deployed automatisch bei jedem Push zu `main`.

   - Build Command: `npm install && npm run build`
   - Start Command: `node build/index.js`

   Diese werden automatisch erkannt.

5. **Domain konfigurieren**

   Railway generiert automatisch eine Domain:
   - Format: `your-project.railway.app`
   - Eigene Domain kann unter Settings → Domains hinzugefügt werden

### Lokales Testen

```bash
# Dependencies installieren
npm install

# Development Server
npm run dev

# Production Build
npm run build

# Production Server lokal testen
npm start
```

### Build Verification

Vor dem Deployment solltest du lokal testen:

```bash
npm run build
npm start
```

Öffne `http://localhost:3000` und prüfe, ob alles funktioniert.

### Troubleshooting

**Build Fehler:**
- Prüfe Node Version (min. 18)
- Lösche `node_modules` und `package-lock.json`, dann `npm install`

**Runtime Fehler:**
- Prüfe Railway Logs im Dashboard
- Stelle sicher, dass Port richtig gebunden wird (Railway setzt automatisch `PORT`)

**API Fehler:**
- Prüfe ob Clockify API Key korrekt in der App eingegeben wurde
- Teste API Key unter: https://app.clockify.me/user/settings

### Staging Environment

Für ein Staging Environment:

1. Erstelle einen `develop` Branch
2. Erstelle neues Railway Projekt für Staging
3. Verbinde mit `develop` Branch
4. Konfiguriere separate Environment Variables

### Monitoring

Railway bietet:
- Real-time Logs
- Metrics (CPU, Memory, Network)
- Deploy History
- Rollback Funktionalität

Zugriff über: Railway Dashboard → Dein Projekt → Deployments

### Kosten

Railway bietet:
- $5 monatlich Free Credit
- Pay-as-you-go danach
- Diese App sollte mit Free Tier auskommen (sehr leichtgewichtig)

### Support

Bei Problemen:
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub Issues: Erstelle ein Issue in diesem Repo

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
