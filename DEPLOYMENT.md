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

`ORIGIN` wird seit SvelteKit 3 beim **Bauen** gelesen, nicht mehr beim Start:
`ORIGIN=https://zeit.example.com npm run build`. Fehlt sie beim Build, nimmt
die App die Herkunft aus dem `Host`-Header und geht von `https` aus. Hinter
einem Proxy, der TLS terminiert und den Host weiterreicht, passt das; sonst
lehnt SvelteKit Formular- und API-Posts mit `403` ab.

`DATABASE_URL` liest die App weiterhin beim Start. Sie ist in `src/env.ts`
deklariert und darf beim Bauen fehlen.

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
Wichtig ist nur, dass `ORIGIN` beim Build exakt der öffentlichen URL entspricht,
inklusive Schema und ohne abschließenden Slash, oder dass der Proxy den
öffentlichen Host durchreicht.

## Hosting mit Phusion Passenger (z. B. Plesk)

Passenger lädt die Startdatei per `require()`, `adapter-node` erzeugt aber ein
ES-Modul mit Top-Level-`await`. Dafür liegt `app.cjs` bei — ein CommonJS-Wrapper,
der `build/index.js` dynamisch importiert:

- Startdatei: `app.cjs`
- Application Root: das Projektverzeichnis
- Environment-Variablen: `DATABASE_URL` und `ORIGIN` wie oben (`ORIGIN` muss auch
  beim `npm run build` gesetzt sein)

Nach jedem Deploy einmal `npm ci`, `npm run build` und einen Neustart der App.

## Fehlersuche

Wenn die App startet, aber jeder Request 500 liefert, ist fast immer die
Datenbankverbindung schuld. Der Pool wird bewusst erst beim ersten Zugriff
aufgebaut (`lazy init`), damit der Build ohne `DATABASE_URL` durchläuft —
Verbindungsfehler tauchen deshalb erst zur Laufzeit auf, nicht beim Bauen.

Bei `403` auf POST-Requests stimmt `ORIGIN` nicht, oder sie war beim Build
nicht gesetzt.
