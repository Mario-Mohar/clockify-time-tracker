# 🇦🇹 Österreichische Feiertage-Integration

## Übersicht

Die App berücksichtigt jetzt automatisch **alle 13 bundesweiten österreichischen Feiertage**!

## Features

### ✅ Was wurde implementiert?

1. **Alle österreichischen Feiertage**
   - 13 bundesweite gesetzliche Feiertage
   - Bewegliche Feiertage (Ostern-abhängig)
   - Regionale Feiertage werden **nicht** berücksichtigt (wie gewünscht)

2. **Präzise Berechnungen**
   - Arbeitstage werden ohne Feiertage gezählt
   - Soll-Stunden berücksichtigen Feiertage automatisch
   - Korrekte Berechnung für jeden Monat/Jahr

3. **Bundesland-Auswahl**
   - Alle 9 österreichischen Bundesländer
   - Aktuell nur für zukünftige Erweiterungen
   - Standard: Wien

4. **UI-Anzeige**
   - Arbeitstage-Anzeige im Dashboard
   - Feiertage-Anzahl (Monat/Jahr)
   - Icons: 📅 Arbeitstage, 🎉 Feiertage

---

## 🇦🇹 Österreichische Bundesfeiertage

### 13 gesetzliche Feiertage (österreichweit)

| Datum | Feiertag | Typ |
|-------|----------|-----|
| 1. Jänner | Neujahr | Fix |
| 6. Jänner | Heilige Drei Könige | Fix |
| Ostermontag | - | Beweglich (Ostern +1) |
| 1. Mai | Staatsfeiertag | Fix |
| Christi Himmelfahrt | - | Beweglich (Ostern +39) |
| Pfingstmontag | - | Beweglich (Ostern +50) |
| Fronleichnam | - | Beweglich (Ostern +60) |
| 15. August | Mariä Himmelfahrt | Fix |
| 26. Oktober | Nationalfeiertag | Fix |
| 1. November | Allerheiligen | Fix |
| 8. Dezember | Mariä Empfängnis | Fix |
| 25. Dezember | Christtag | Fix |
| 26. Dezember | Stefanitag | Fix |

**Total: 13 bundesweite Feiertage** ✅

---

## 📍 Österreichische Bundesländer

Die App unterstützt alle 9 Bundesländer:

| Kürzel | Bundesland |
|--------|------------|
| B | Burgenland |
| K | Kärnten |
| NÖ | Niederösterreich |
| OÖ | Oberösterreich |
| S | Salzburg |
| ST | Steiermark |
| T | Tirol |
| V | Vorarlberg |
| W | Wien |

**Hinweis**: Regionale Feiertage (z.B. St. Josef, St. Leopold) werden **nicht** berücksichtigt, da nur die 13 bundesweiten Feiertage für die Berechnungen verwendet werden.

---

## 🔧 Verwendung

### 1. Bundesland einstellen (optional)

```
Dashboard → Einstellungen → Bundesland (Österreich)
```

Standardmäßig ist **Wien (W)** eingestellt. Die Auswahl ist für zukünftige Erweiterungen vorhanden.

### 2. Automatische Berechnung

Die App berücksichtigt automatisch:
- ✅ Wochenenden (Samstag, Sonntag)
- ✅ Alle 13 bundesweiten Feiertage
- ✅ Korrekte Arbeitstage pro Monat/Jahr

### 3. Dashboard-Anzeige

Bei **Monat** und **Jahr** Ansicht siehst du:
- 📅 **Arbeitstage**: Anzahl der tatsächlichen Arbeitstage
- 🎉 **Feiertage**: Anzahl der Feiertage im Zeitraum

---

## 📊 Berechnungslogik

### Soll-Zeiten Berechnung

**Mit Feiertagen**:
```
Arbeitstage = Kalendertage - Wochenenden - Feiertage
Soll-Stunden = Arbeitstage × (Wochenstunden ÷ Arbeitstage/Woche)
```

### Beispiel: Dezember 2025

- **Kalendertage**: 31
- **Wochenenden**: 8 Tage (4× Sa+So)
- **Feiertage**: 3 Tage (8., 25., 26. Dezember)
- **Arbeitstage**: 31 - 8 - 3 = **20 Tage**

Bei 40h/Woche (5 Tage):
- Stunden/Tag: 40h ÷ 5 = 8h
- **Soll-Stunden**: 20 × 8h = **160h**

---

## 💻 Technische Details

### Osterberechnung

Die App nutzt die **Gaußsche Osterformel** (Meeus/Jones/Butcher):
- Präzise für Jahre 1583-4099
- Berücksichtigt gregorianischen Kalender
- Basis für bewegliche Feiertage

### Bewegliche Feiertage

Berechnet relativ zu Ostersonntag:
- Ostermontag: Ostern +1
- Christi Himmelfahrt: Ostern +39
- Pfingstmontag: Ostern +50
- Fronleichnam: Ostern +60

---

## 🔄 Migration

### Alte Configs

Bestehende Konfigurationen werden automatisch migriert:
- Standardwert: `state: 'W'` (Wien)
- Keine Datenverluste
- Transparent für Benutzer

---

## 📈 Beispiele

### Jänner 2025

| Wert | Anzahl |
|------|--------|
| Kalendertage | 31 |
| Wochenenden | 8 |
| Feiertage | 2 (Neujahr + Heilige 3 Könige) |
| **Arbeitstage** | **21** |
| **Soll (40h/Woche)** | **168h** |

### Mai 2025

| Wert | Anzahl |
|------|--------|
| Kalendertage | 31 |
| Wochenenden | 8 |
| Feiertage | 3 (Staatsfeiertag + Christi Himmelfahrt + Pfingstmontag*) |
| **Arbeitstage** | **20** |
| **Soll (40h/Woche)** | **160h** |

*Pfingstmontag ist am 9. Juni 2025

### November 2025

| Wert | Anzahl |
|------|--------|
| Kalendertage | 30 |
| Wochenenden | 8 |
| Feiertage | 1 (Allerheiligen) |
| **Arbeitstage** | **21** |
| **Soll (40h/Woche)** | **168h** |

### Dezember 2025

| Wert | Anzahl |
|------|--------|
| Kalendertage | 31 |
| Wochenenden | 8 |
| Feiertage | 3 (Mariä Empfängnis + Christtag + Stefanitag) |
| **Arbeitstage** | **20** |
| **Soll (40h/Woche)** | **160h** |

---

## 🎯 Vorteile

### Präzision
✅ Exakte Soll-Zeiten für jeden Monat
✅ Berücksichtigt alle bundesweiten Feiertage
✅ Keine manuellen Anpassungen nötig

### Einfachheit
✅ Nur 13 bundesweite Feiertage
✅ Keine komplizierten regionalen Unterschiede
✅ Gleiche Regeln für ganz Österreich

### Fairness
✅ Feiertage werden nicht als Arbeitstage gezählt
✅ Korrekte Overtime-Berechnung
✅ Transparente Darstellung

---

## 🔮 Zukünftige Erweiterungen

### Möglich
- ⬜ Regionale Feiertage aktivieren (optional)
- ⬜ Urlaubstage manuell erfassen
- ⬜ Krankheitstage berücksichtigen
- ⬜ Halbe Arbeitstage
- ⬜ Export mit Feiertags-Details

---

## 📝 API Referenz

### Funktionen

```typescript
// Get holidays for a year
getAustrianHolidays(year: number, state?: AustrianState): Holiday[]

// Check if date is holiday
isHoliday(date: Date, state: AustrianState): boolean

// Check if date is working day
isWorkingDay(date: Date, state: AustrianState): boolean

// Count working days in range
countWorkingDaysWithHolidays(
  start: Date,
  end: Date,
  state: AustrianState
): number

// Get holidays for specific month
getMonthHolidays(
  year: number,
  month: number,
  state: AustrianState
): Holiday[]
```

### Types

```typescript
type AustrianState =
  | 'B'   // Burgenland
  | 'K'   // Kärnten
  | 'NÖ'  // Niederösterreich
  | 'OÖ'  // Oberösterreich
  | 'S'   // Salzburg
  | 'ST'  // Steiermark
  | 'T'   // Tirol
  | 'V'   // Vorarlberg
  | 'W';  // Wien

interface Holiday {
  date: Date;
  name: string;
  isNational: boolean;
  states: AustrianState[];
}
```

---

## 🎉 Zusammenfassung

Die Feiertags-Integration macht die Zeiterfassung für Österreich **präziser** und **fairer**!

**Keine Sorgen mehr über:**
- ❌ Falsche Soll-Zeiten in Monaten mit Feiertagen
- ❌ Manuelle Anpassungen
- ❌ Regionale Unterschiede

**Stattdessen:**
- ✅ Automatische, korrekte Berechnungen
- ✅ 13 bundesweite Feiertage
- ✅ Transparente Anzeige
- ✅ Österreich-spezifisch

---

## 🇦🇹 Österreich-Spezifisch

Diese Implementierung ist speziell für **Österreich** optimiert:
- Alle 13 gesetzlichen Feiertage
- Österreichische Bundesländer
- Österreichische Begriffe (Jänner statt Januar, etc.)
- Keine deutschen Feiertage (z.B. kein Tag der Deutschen Einheit)

---

**Implementiert**: 2025-11-21
**Version**: 1.1.0-AT
**Land**: 🇦🇹 Österreich
**Dateien**: `src/lib/utils/holidays.ts` (230 Zeilen)
