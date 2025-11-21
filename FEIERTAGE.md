# 🎉 Feiertage-Integration

## Übersicht

Die App berücksichtigt jetzt automatisch **deutsche Feiertage** basierend auf Ihrem Bundesland!

## Features

### ✅ Was wurde implementiert?

1. **Alle deutschen Feiertage**
   - Bundesweite Feiertage (9 Tage)
   - Bundesland-spezifische Feiertage
   - Bewegliche Feiertage (Ostern-abhängig)

2. **Präzise Berechnungen**
   - Arbeitstage werden ohne Feiertage gezählt
   - Soll-Stunden berücksichtigen Feiertage
   - Korrekte Berechnung für jeden Monat/Jahr

3. **Bundesland-Auswahl**
   - Alle 16 Bundesländer unterstützt
   - Einfache Auswahl in den Einstellungen

4. **UI-Anzeige**
   - Arbeitstage-Anzeige im Dashboard
   - Feiertage-Anzahl (Monat/Jahr)
   - Icons: 📅 Arbeitstage, 🎉 Feiertage

---

## Deutsche Feiertage

### 🇩🇪 Bundesweite Feiertage (alle Bundesländer)

| Datum | Feiertag |
|-------|----------|
| 1. Januar | Neujahr |
| Karfreitag | Ostern -2 Tage (beweglich) |
| Ostermontag | Ostern +1 Tag (beweglich) |
| 1. Mai | Tag der Arbeit |
| Christi Himmelfahrt | Ostern +39 Tage (beweglich) |
| Pfingstmontag | Ostern +50 Tage (beweglich) |
| 3. Oktober | Tag der Deutschen Einheit |
| 25. Dezember | 1. Weihnachtsfeiertag |
| 26. Dezember | 2. Weihnachtsfeiertag |

**Total: 9 bundesweite Feiertage**

---

### 📍 Bundesland-spezifische Feiertage

#### Baden-Württemberg (BW) - 12 Feiertage
- ✅ Alle bundesweiten Feiertage
- ➕ Heilige Drei Könige (6. Januar)
- ➕ Fronleichnam (Ostern +60 Tage)
- ➕ Allerheiligen (1. November)

#### Bayern (BY) - 13 Feiertage
- ✅ Alle bundesweiten Feiertage
- ➕ Heilige Drei Könige (6. Januar)
- ➕ Fronleichnam (Ostern +60 Tage)
- ➕ Mariä Himmelfahrt (15. August)
- ➕ Allerheiligen (1. November)

#### Berlin (BE) - 10 Feiertage
- ✅ Alle bundesweiten Feiertage
- ➕ Internationaler Frauentag (8. März)

#### Brandenburg (BB) - 10 Feiertage
- ✅ Alle bundesweiten Feiertage
- ➕ Reformationstag (31. Oktober)

#### Bremen (HB) - 9 Feiertage
- ✅ Alle bundesweiten Feiertage

#### Hamburg (HH) - 9 Feiertage
- ✅ Alle bundesweiten Feiertage

#### Hessen (HE) - 10 Feiertage
- ✅ Alle bundesweiten Feiertage
- ➕ Fronleichnam (Ostern +60 Tage)

#### Mecklenburg-Vorpommern (MV) - 10 Feiertage
- ✅ Alle bundesweiten Feiertage
- ➕ Reformationstag (31. Oktober)

#### Niedersachsen (NI) - 9 Feiertage
- ✅ Alle bundesweiten Feiertage

#### Nordrhein-Westfalen (NW) - 11 Feiertage
- ✅ Alle bundesweiten Feiertage
- ➕ Fronleichnam (Ostern +60 Tage)
- ➕ Allerheiligen (1. November)

#### Rheinland-Pfalz (RP) - 11 Feiertage
- ✅ Alle bundesweiten Feiertage
- ➕ Fronleichnam (Ostern +60 Tage)
- ➕ Allerheiligen (1. November)

#### Saarland (SL) - 12 Feiertage
- ✅ Alle bundesweiten Feiertage
- ➕ Fronleichnam (Ostern +60 Tage)
- ➕ Mariä Himmelfahrt (15. August)
- ➕ Allerheiligen (1. November)

#### Sachsen (SN) - 11 Feiertage
- ✅ Alle bundesweiten Feiertage
- ➕ Reformationstag (31. Oktober)
- ➕ Buß- und Bettag (November, beweglich)

#### Sachsen-Anhalt (ST) - 11 Feiertage
- ✅ Alle bundesweiten Feiertage
- ➕ Heilige Drei Könige (6. Januar)
- ➕ Reformationstag (31. Oktober)

#### Schleswig-Holstein (SH) - 9 Feiertage
- ✅ Alle bundesweiten Feiertage

#### Thüringen (TH) - 11 Feiertage
- ✅ Alle bundesweiten Feiertage
- ➕ Reformationstag (31. Oktober)
- ➕ Weltkindertag (20. September)

---

## 🔧 Verwendung

### 1. Bundesland einstellen

```
Dashboard → Einstellungen → Bundesland auswählen
```

Standardmäßig ist **Nordrhein-Westfalen (NW)** eingestellt.

### 2. Automatische Berechnung

Die App berücksichtigt automatisch:
- ✅ Wochenenden (Samstag, Sonntag)
- ✅ Feiertage deines Bundeslandes
- ✅ Korrekte Arbeitstage pro Monat/Jahr

### 3. Dashboard-Anzeige

Bei **Monat** und **Jahr** Ansicht siehst du:
- 📅 **Arbeitstage**: Anzahl der tatsächlichen Arbeitstage
- 🎉 **Feiertage**: Anzahl der Feiertage (falls vorhanden)

---

## 📊 Berechnungslogik

### Soll-Zeiten Berechnung

**Alte Berechnung** (nur Wochenenden):
```
Arbeitstage = Kalendertage - Wochenenden
Soll-Stunden = Arbeitstage × (Wochenstunden ÷ Arbeitstage/Woche)
```

**Neue Berechnung** (mit Feiertagen):
```
Arbeitstage = Kalendertage - Wochenenden - Feiertage
Soll-Stunden = Arbeitstage × (Wochenstunden ÷ Arbeitstage/Woche)
```

### Beispiel: Dezember 2025 (NW)

- **Kalendertage**: 31
- **Wochenenden**: 8 Tage (4× Sa+So)
- **Feiertage**: 2 Tage (25.+26. Dez)
- **Arbeitstage**: 31 - 8 - 2 = **21 Tage**

Bei 40h/Woche (5 Tage):
- Stunden/Tag: 40h ÷ 5 = 8h
- **Soll-Stunden**: 21 × 8h = **168h**

---

## 💻 Technische Details

### Osterberechnung

Die App nutzt die **Gaußsche Osterformel** (Meeus/Jones/Butcher):
- Präzise für Jahre 1583-4099
- Berücksichtigt gregorianischen Kalender
- Basis für bewegliche Feiertage

### Bewegliche Feiertage

Berechnet relativ zu Ostersonntag:
- Karfreitag: Ostern -2
- Ostermontag: Ostern +1
- Christi Himmelfahrt: Ostern +39
- Pfingstmontag: Ostern +50
- Fronleichnam: Ostern +60

### Buß- und Bettag (SN)

Spezieller Fall (nur Sachsen):
- Mittwoch vor dem 23. November
- Eigener Algorithmus

---

## 🔄 Migration

### Alte Configs

Bestehende Konfigurationen werden automatisch migriert:
- Standardwert: `state: 'NW'` (Nordrhein-Westfalen)
- Keine Datenverluste
- Transparent für Benutzer

### Update-Prozess

1. App lädt alte Config
2. Erkennt fehlendes `state` Feld
3. Fügt `state: 'NW'` hinzu
4. Speichert aktualisierte Config

---

## 📈 Beispiele

### Januar 2025 (BY - Bayern)

| Wert | Anzahl |
|------|--------|
| Kalendertage | 31 |
| Wochenenden | 8 |
| Feiertage | 2 (Neujahr + Heilige 3 Könige) |
| **Arbeitstage** | **21** |
| **Soll (40h/Woche)** | **168h** |

### Oktober 2025 (NW - NRW)

| Wert | Anzahl |
|------|--------|
| Kalendertage | 31 |
| Wochenenden | 8 |
| Feiertage | 1 (Tag der Deutschen Einheit) |
| **Arbeitstage** | **22** |
| **Soll (40h/Woche)** | **176h** |

### November 2025 (SN - Sachsen)

| Wert | Anzahl |
|------|--------|
| Kalendertage | 30 |
| Wochenenden | 8 |
| Feiertage | 1 (Buß- und Bettag) |
| **Arbeitstage** | **21** |
| **Soll (40h/Woche)** | **168h** |

---

## 🎯 Vorteile

### Präzision
✅ Exakte Soll-Zeiten für jeden Monat
✅ Berücksichtigt regionale Unterschiede
✅ Keine manuellen Anpassungen nötig

### Fairness
✅ Feiertage werden nicht als Arbeitstage gezählt
✅ Korrekte Overtime-Berechnung
✅ Transparente Darstellung

### Flexibilität
✅ Alle 16 Bundesländer unterstützt
✅ Automatische Updates bei Bundesland-Wechsel
✅ Historische Genauigkeit

---

## 🔮 Zukünftige Erweiterungen

### Geplant
- ⬜ Urlaubstage manuell erfassen
- ⬜ Krankheitstage berücksichtigen
- ⬜ Halbe Arbeitstage
- ⬜ Individuelle Arbeitszeiten pro Wochentag
- ⬜ Export mit Feiertags-Details
- ⬜ Feiertags-Kalenderansicht

### Möglich
- ⬜ Österreichische Feiertage
- ⬜ Schweizer Kantone
- ⬜ Internationale Feiertage

---

## 📝 API Referenz

### Funktionen

```typescript
// Get holidays for a year and state
getGermanHolidays(year: number, state?: GermanState): Holiday[]

// Check if date is holiday
isHoliday(date: Date, state: GermanState): boolean

// Check if date is working day
isWorkingDay(date: Date, state: GermanState): boolean

// Count working days in range
countWorkingDaysWithHolidays(
  start: Date,
  end: Date,
  state: GermanState
): number

// Get holidays for specific month
getMonthHolidays(
  year: number,
  month: number,
  state: GermanState
): Holiday[]
```

### Types

```typescript
type GermanState =
  | 'BW' | 'BY' | 'BE' | 'BB' | 'HB' | 'HH' | 'HE' | 'MV'
  | 'NI' | 'NW' | 'RP' | 'SL' | 'SN' | 'ST' | 'SH' | 'TH';

interface Holiday {
  date: Date;
  name: string;
  isNational: boolean;
  states: GermanState[];
}
```

---

## 🎉 Zusammenfassung

Die Feiertags-Integration macht die Zeiterfassung **präziser**, **fairer** und **regionaler**!

**Keine Sorgen mehr über:**
- ❌ Falsche Soll-Zeiten in Monaten mit Feiertagen
- ❌ Manuelle Anpassungen
- ❌ Ungerechte Overtime-Berechnung

**Stattdessen:**
- ✅ Automatische, korrekte Berechnungen
- ✅ Transparente Anzeige
- ✅ Bundesland-gerechte Genauigkeit

---

**Implementiert**: 2025-11-21
**Version**: 1.1.0
**Dateien**: `src/lib/utils/holidays.ts` (240 Zeilen)
