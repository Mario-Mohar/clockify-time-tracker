# Mitarbeit

Oberfläche, Dokumentation und Commits sind auf Deutsch — englische Beiträge sind
willkommen, dann übersetze ich die nutzersichtbaren Texte beim Zusammenführen.

## Beiträge sind erwünscht

Das hier ist ein kleines Projekt, das eine einzelne Person nebenher pflegt — und
genau deshalb ist ein fremder Blick viel wert. **Einen Fehler zu finden und
aufzuschreiben ist ein echter Beitrag**, vermutlich sogar der nützlichste: ich
benutze das nur auf meinem eigenen Rechner, mit meiner eigenen Einrichtung, und
das meiste, was kaputt ist, ist dort kaputt, wo ich nie hinschaue.

Drei Wege zu helfen, sortiert danach, was sie dich kosten:

### 1. Etwas melden, das nicht stimmt

Ein Issue mit der Vorlage **Fehlerbericht** aufmachen. Sie fragt das ab, was ich
sonst nachfragen müsste — und eine Nachfrage kostet uns beide einen Tag.

Worauf es wirklich ankommt:

- **Was du erwartet hast, und was stattdessen passiert ist.** Beide Hälften.
  „Geht nicht" ist die eine Meldung, mit der ich nichts anfangen kann.
- **Die Schritte dorthin.** Wenn du es wiederholen kannst, schreib wie. Wenn es
  nur einmal auftrat, schreib auch das — ein sporadischer Fehler ist trotzdem
  wissenswert, und „ich konnte es nicht nachstellen" ist eine Information, kein
  Ausschlussgrund.
- **Deine Umgebung**, so wie die Vorlage danach fragt.

Feil nicht daran herum. Eine grobe Meldung heute ist mehr wert als eine perfekte,
die nie geschrieben wird. Und wenn du unsicher bist, ob etwas überhaupt ein
Fehler ist: mach es trotzdem auf. Das zu entscheiden ist meine Aufgabe, nicht
deine.

### 2. Vorschlagen, was es können sollte

Ein Issue mit der Vorlage **Funktionswunsch**.

Sie fragt zuerst, was du *erreichen* willst, und erst dann, was gebaut werden
soll. Das ist Absicht und keine Hürde: ungefähr in der Hälfte der Fälle gibt es
einen einfacheren Weg als den, den wir beide zuerst im Kopf hatten — aber der
zeigt sich nur, wenn ich die Ausgangslage kenne.

Ein abgelehnter Wunsch ist kein vergeudetes Issue. „Jetzt nicht" und „nicht in
diesem Projekt" bekommst du schnell und mit Begründung.

### 3. Eine Korrektur oder Funktion schicken

Sehr willkommen, und für Kleinigkeiten musst du nicht vorher fragen.

**Bei allem, was über ein paar Zeilen hinausgeht, vorher ein Issue aufmachen** —
oder am bestehenden kommentieren — und sagen, dass du daran arbeitest. Das kostet
dich einen Satz und erspart dir den Fall, dass ich dasselbe am selben Abend
behoben habe oder es anders gelöst haben wollte.

Weil du in dieses Repository nicht schreiben kannst, läuft es über einen Fork:

```bash
# 1. Auf GitHub forken, dann deinen Fork klonen
git clone https://github.com/<dein-benutzername>/clockify-time-tracker.git
cd clockify-time-tracker

# 2. Ein Zweig. Name egal.
git switch -c fix/die-sache

# 3. Ändern, worum es dir geht, dann die Prüfungen unten laufen lassen

# 4. In deinen Fork pushen und den Pull Request aufmachen
git push -u origin fix/die-sache
```

GitHub bietet dir danach den Knopf für den Pull Request an. Fülle die Vorlage
aus, und wenn er ein Issue erledigt, schreib `Fixes #12` hinein — dann schließt
es sich beim Zusammenführen von selbst.

## Was danach passiert

1. **Die Pipeline läuft** und schreibt einen Kommentar an deinen Pull Request,
   mit einer Tabelle, was durchgelaufen ist. Sie aktualisiert denselben
   Kommentar bei jedem Push, es gibt also eine Stelle zum Nachsehen statt eines
   wachsenden Stapels.
2. **Sie beschriftet den Pull Request** nach Umfang und Art und setzt
   `ready-to-merge`, sobald alles grün ist.
3. **Beim allerersten Beitrag warten die Prüfungen auf meine Freigabe.** Das
   macht GitHub von sich aus, damit fremder Code die Rechenzeit nicht ungefragt
   benutzt. Wenn dein Pull Request bei „waiting for approval" steht, **ist nichts
   kaputt und du musst nichts tun** — ich muss einmal klicken.
4. **Zusammengeführt wird von mir.** Auf den Standardzweig kommt nichts, was
   nicht durch einen Pull Request mit grünen Prüfungen gegangen ist; das gilt
   auch für meine eigenen Commits.

Ist eine Prüfung rot, steht im Protokoll welche und warum. Frag im Pull Request
nach, wenn es nicht offensichtlich ist — eine rote Pipeline ist keine Absage,
und ziemlich oft liegt der Fehler bei ihr und nicht bei dir.

Ich mache das neben einem Beruf, eine Antwort kann also ein paar Tage dauern.
Das ist kein Desinteresse.

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

- Zweig von `main` weg, **in deinem Fork** (siehe oben). Der Zweigname ist frei.
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
