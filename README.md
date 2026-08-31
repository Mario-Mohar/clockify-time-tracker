# Clockify Time Tracker

Eine schlanke Weboberfläche, die deine in **Clockify** erfassten Stunden gegen
dein Arbeitszeitmodell rechnet — inklusive österreichischer Feiertage und
Urlaubsverwaltung. Für Tag, Woche, Monat und Jahr.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2-ff3e00.svg)](https://kit.svelte.dev/)
[![Tests](https://img.shields.io/badge/tests-32%20passing-brightgreen.svg)](#entwicklung)

> *A mobile-first web app that compares hours tracked in Clockify against your
> contracted working time, accounting for Austrian public holidays and booked
> vacation. UI and docs are in German.*

<p align="center">
  <img src="docs/dashboard.png" alt="Monatsansicht: Urlaubsübersicht mit genommenen, geplanten und verfügbaren Tagen, darunter Soll 161:42h gegen Ist 172h und eine Differenz von plus 10:18 Stunden" width="380">
  &nbsp;&nbsp;
  <img src="docs/urlaub.png" alt="Urlaubsverwaltung: Liste der Urlaubszeiträume für 2026 mit Zeitraum, Notiz und Anzahl der Arbeitstage" width="380">
</p>

<p align="center"><sub>Screenshots aus der laufenden App mit Demo-Daten.</sub></p>

Clockify sagt dir, wie viel du gearbeitet hast. Es sagt dir nicht, wie viel du
in diesem Monat hättest arbeiten *sollen* — nicht, wenn ein Feiertag drin liegt
und du zwei Wochen Urlaub hattest. Genau diese Rechnung macht diese App.

## Wie Soll und Ist entstehen

<p align="center">
  <img src="docs/berechnung.png" alt="Diagramm: Soll ergibt sich aus Kalendertagen minus Wochenenden minus Feiertagen mal Stunden pro Tag. Ist ergibt sich aus Clockify-Stunden plus Urlaubsstunden. Die Differenz wird als Minusstunden, im Rahmen oder Überstunden eingefärbt." width="900">
</p>

**Soll** sind die Arbeitstage im Zeitraum — Tage, an denen du nicht arbeitest,
und Feiertage fallen raus — multipliziert mit deinen Stunden pro Tag
(Wochenstunden geteilt durch die Anzahl deiner Arbeitstage). Welche Wochentage
das sind, stellst du selbst ein; wer Montag bis Donnerstag arbeitet, bekommt
den Freitag nicht als Sollzeit angerechnet, und ein Feiertag zieht nur ab, wenn
er auf einen deiner Arbeitstage fällt.

**Ist** sind die in Clockify erfassten Stunden plus die Stunden aus
eingetragenem Urlaub und Krankenstand. Beides zählt als voller Arbeitstag,
sonst würde jede Urlaubs- oder Krankenwoche als Minusstunden erscheinen. Ein
halber Tag zählt als halber.

**Differenz** ist Ist minus Soll, mit einer Toleranz von einer Stunde: darüber
Überstunden, darunter Minusstunden, dazwischen „im Rahmen".

## Funktionen

- **Vier Zeiträume** — Tag, Woche, Monat, Jahr, jeweils mit Soll, Ist und Differenz
- **Österreichische Feiertage** — alle 13 bundesweiten Feiertage, auch die
  beweglichen rund um Ostern, werden vom Soll abgezogen
- **Urlaubsverwaltung** — Zeiträume mit Notiz anlegen, Überschneidungen werden
  abgelehnt; die App zählt genommene, geplante und verbleibende Tage gegen dein
  Jahreskontingent
- **Halbe Tage** — bei einem Eintrag über einen einzelnen Tag lässt sich „halber
  Tag" ankreuzen. Sechs halbe Tage verbrauchen drei, nicht sechs
- **Krankenstand** — als eigener Eintragstyp neben dem Urlaub. Für die
  Sollstunden zählt er gleich, gegen das Urlaubskontingent zählt er nicht: er
  wird getrennt ausgewiesen und nicht begrenzt
- **Arbeitszeitmodell** — Wochenstunden, die einzelnen Arbeitstage und
  Urlaubsanspruch sind frei einstellbar (Vorgabe: 40 h, 5 Tage, 25 Tage Urlaub)
- **Mobile-first** — gebaut für das Telefon, funktioniert auch am Desktop
- **Der API-Key bleibt bei dir** — er liegt im `localStorage` deines Browsers,
  wird nie serverseitig gespeichert und dient zugleich als Login

Der Bundesland-Wähler ist vorhanden, hat aber derzeit keinen Effekt auf die
Berechnung: alle 13 hinterlegten Feiertage gelten österreichweit. Er ist für
landesspezifische Tage vorbereitet.

## Voraussetzungen

- Node.js 18 oder neuer
- Ein Clockify-Konto und dessen API-Key
- MariaDB oder MySQL — nur für die Urlaubsverwaltung

## Schnellstart

```bash
git clone https://github.com/Mario-Mohar/clockify-time-tracker.git
cd clockify-time-tracker
npm install

cp .env.example .env      # DATABASE_URL eintragen
docker compose up -d      # lokale MariaDB, optional

npm run dev
```

Dann im Browser den Clockify-API-Key eingeben — zu finden in den
[Clockify-Einstellungen](https://app.clockify.me/user/settings). Die Tabelle für
den Urlaub legt die App beim ersten Zugriff selbst an.

## Konfiguration

| Variable | Zweck |
|----------|-------|
| `DATABASE_URL` | `mysql://user:passwort@host:3306/datenbank` |
| `ORIGIN` | Öffentliche URL, nur in Produktion nötig (siehe [DEPLOYMENT.md](DEPLOYMENT.md)) |

Das Arbeitszeitmodell wird nicht über Variablen gesetzt, sondern in der App
unter „Einstellungen".

## Wie der API-Key behandelt wird

Der Clockify-API-Key ist zugleich das Login. Er wird im Browser gespeichert und
bei jedem Request als `X-Api-Key`-Header mitgeschickt. Der Server nimmt ihn
entgegen, fragt damit `GET /user` bei Clockify und benutzt die zurückgegebene
User-ID, um die Urlaubseinträge zuzuordnen — gespeichert wird der Key
serverseitig nie. Ein ungültiger Key führt zu `401`.

Das heißt auch: Wer die App öffentlich hostet, hostet keine fremden
Zugangsdaten. Es heißt aber ebenso, dass der Key im Browser liegt — auf einem
geteilten Rechner also abmelden.

## Deployment

`npm run build` erzeugt über `@sveltejs/adapter-node` einen gewöhnlichen
Node-Server. Details, inklusive der `ORIGIN`-Falle und eines Wrappers für
Phusion Passenger, stehen in [DEPLOYMENT.md](DEPLOYMENT.md).

## Entwicklung

```bash
npm run dev      # Dev-Server
npm test         # Vitest, 14 Tests
npm run check    # svelte-check mit TypeScript
npm run build    # Produktions-Build
```

Getestet ist derzeit die Urlaubslogik (Überschneidungen, Arbeitstagezählung,
Jahresabgrenzung). Die Soll/Ist-Berechnung und die Feiertagsermittlung sind
noch nicht durch Tests abgedeckt — ein guter erster Beitrag.

### Aufbau

```
src/
  lib/
    api/         clockify.ts (Clockify REST), vacations.ts (eigene API)
    server/      auth.ts (API-Key gegen Clockify prüfen), db.ts, vacations.ts
    stores/      auth, config, vacations
    utils/       calculations.ts (Soll/Ist), holidays.ts (AT), vacation.ts
    components/  Dashboard, Login, Settings, VacationList, VacationModal, VacationTile
  routes/
    +page.svelte           Login oder Dashboard
    settings/              Arbeitszeitmodell
    urlaub/                Urlaubsverwaltung
    api/vacations/         REST-Endpunkte
```

## Lizenz

MIT — siehe [LICENSE](LICENSE).
