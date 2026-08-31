# Mitarbeit

Danke fürs Vorbeischauen. Das Projekt ist klein, der Ablauf entsprechend kurz.
Oberfläche, Dokumentation und Commits sind auf Deutsch — englische Beiträge sind
willkommen, dann übersetze ich die nutzersichtbaren Texte beim Zusammenführen.

## Einrichten

```bash
git clone https://github.com/Mario-Mohar/clockify-time-tracker.git
cd clockify-time-tracker
npm ci
npm run dev
```

Node 18 oder neuer. Einen Clockify-Zugang brauchst du zum Mitarbeiten **nicht**:
die Rechenkerne unter `src/lib/utils/` sind reine Funktionen und werden ohne
Netzverbindung getestet.

## Prüfungen

Die Pipeline führt genau das aus, was du hier ausführen kannst:

```bash
npm run check   # svelte-check
npm test        # vitest run
npm run build   # vite build
```

Alle drei müssen grün sein, damit ein Pull Request zusammengeführt werden kann.

## Worauf es bei diesem Projekt ankommt

**Die Rechnung ist der ganze Punkt.** Clockify sagt, wie viel gearbeitet wurde;
diese App sagt, wie viel hätte gearbeitet werden *sollen*. Alles, was an
`calculations.ts`, `vacation.ts` oder `holidays.ts` rührt, gehört mit einem Test
belegt — dort ist ein stiller Fehler besonders teuer, weil er als plausible Zahl
durchgeht statt als Absturz aufzufallen.

**Feiertage sind gesetzlich, nicht meinungsabhängig.** `holidays.ts` bildet die
österreichischen Feiertage ab. Wer daran etwas ändert, gibt bitte die Quelle an.
Bewegliche Feiertage hängen am Ostersonntag — für Änderungen dort bitte
mindestens zwei Jahre gegenrechnen, davon eines mit spätem Ostern.

**Halbe Tage und Krankenstand sind eigene Kategorien.** Krankenstand zählt
ausdrücklich nicht gegen das Urlaubskontingent. Wer eine neue Abwesenheitsart
ergänzt, muss entscheiden und dokumentieren, wie sie in Soll, Ist und Kontingent
eingeht.

**Zeitzonen und Sommerzeit.** Ein Arbeitstag ist ein Kalendertag in lokaler
Zeit, nicht 24 Stunden ab Mitternacht UTC. Wer mit Datumsgrenzen rechnet, prüft
das bitte mit einer Zeitzone abseits von UTC gegen.

## Pull Requests

- Zweig von `main` weg. Der Zweigname ist frei.
- Commit-Stil `fix(bereich):`, `feat(bereich):`, `docs:`, `chore:`. Die
  Pipeline liest das Präfix des PR-Titels für die Beschriftung.
- Die Pipeline kommentiert das Ergebnis und aktualisiert diesen Kommentar bei
  jedem Push. Grün und kein Entwurf ergibt die Marke `ready-to-merge`.
- Für einen genaueren Blick können Betreuer `/claude review` kommentieren.

Ein Fehlerbericht mit dem Test, der ihn gefunden hätte, ist das Ideal — keine
Eintrittsbedingung.

## Etwas melden

Bitte die Issue-Vorlagen benutzen. **Niemals einen Clockify-API-Schlüssel, eine
Arbeitsbereichs-ID oder echte Stundenbuchungen einfügen.** Für einen
Rechenfehler genügen fast immer: Zeitraum, Arbeitszeitmodell, erwartete und
tatsächliche Zahl.

## Lizenz

MIT, wie das Projekt. Mit deinem Beitrag stimmst du zu, dass er darunter
erscheint.
