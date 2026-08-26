# Deployment

Die App wird mit `@sveltejs/adapter-node` gebaut und läuft danach als
gewöhnlicher Node-Prozess. Sie braucht genau zwei Dinge: eine MariaDB- oder
MySQL-Datenbank und zwei Umgebungsvariablen.

## Build

```bash
npm ci
npm run build       # erzeugt build/
node build/index.js # startet den Server, Standard-Port 3000
```

## Umgebungsvariablen

| Variable | Zweck |
|----------|-------|
| `DATABASE_URL` | `mysql://user:passwort@host:3306/datenbank` |
| `ORIGIN` | Die öffentliche URL, z. B. `https://zeit.example.com` |

`ORIGIN` ist nicht optional, sobald POST-Requests im Spiel sind: SvelteKit
prüft bei Formular- und API-Posts die Herkunft und lehnt sie ohne passende
`ORIGIN` mit `403 Cross-site POST form submissions are forbidden` ab.

Der Clockify-API-Key gehört **nicht** hierher. Den gibt jede Person selbst in
der App ein; er bleibt im Browser (`localStorage`) und wandert bei jedem
Request als `X-Api-Key`-Header zum Server, der ihn nur an Clockify
weiterreicht. Gespeichert wird er serverseitig nie.

## Datenbank

Die Tabelle für die Urlaubsverwaltung legt die App beim ersten Start selbst an
(`initDb()`). Es gibt keinen separaten Migrationsschritt und kein
`migrate deploy` im Startpfad — ein leeres Schema genügt.

Für lokale Entwicklung liegt eine `docker-compose.yml` bei:

```bash
docker compose up -d
# DATABASE_URL=mysql://zeiterfassung:zeiterfassung@localhost:3306/zeiterfassung
```

## Reverse Proxy

Vor den Node-Prozess gehört ein Reverse Proxy, der TLS terminiert und auf den
App-Port weiterleitet — nginx, Caddy, Traefik oder was der Hoster anbietet.
Wichtig ist nur, dass `ORIGIN` exakt der öffentlichen URL entspricht, inklusive
Schema und ohne abschließenden Slash.

## Hosting mit Phusion Passenger (z. B. Plesk)

Passenger lädt die Startdatei per `require()`, `adapter-node` erzeugt aber ein
ES-Modul mit Top-Level-`await`. Dafür liegt `app.cjs` bei — ein CommonJS-Wrapper,
der `build/index.js` dynamisch importiert:

- Startdatei: `app.cjs`
- Application Root: das Projektverzeichnis
- Environment-Variablen: `DATABASE_URL` und `ORIGIN` wie oben

Nach jedem Deploy einmal `npm ci`, `npm run build` und einen Neustart der App.

## Fehlersuche

Wenn die App startet, aber jeder Request 500 liefert, ist fast immer die
Datenbankverbindung schuld. Der Pool wird bewusst erst beim ersten Zugriff
aufgebaut (`lazy init`), damit der Build ohne `DATABASE_URL` durchläuft —
Verbindungsfehler tauchen deshalb erst zur Laufzeit auf, nicht beim Bauen.

Bei `403` auf POST-Requests stimmt `ORIGIN` nicht.
