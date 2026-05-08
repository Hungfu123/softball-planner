# Live-Scoring ERROR-Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Live-Scoring um Reached-on-Error (ROE) erweitern: neuer ERROR-Button in Reihe 2, Batter→1B, Forced-Advance, eigene Stats-Kategorie ohne Hit/Out.

**Architecture:** Domain-Enum `AtBatResult.REACHED_ON_ERROR` + Stats-Bucket im `BattingStatsCalculator` + DTO-Feld + Frontend-Switch-Case in `advanceBases` (mirrors WALK/HBP) + neuer Button in `ActionButtons.tsx`. JPA-Mapping bleibt automatisch (Enum als VARCHAR(32)).

**Tech Stack:** Spring Boot/JPA, React/TypeScript, Tailwind, JUnit/AssertJ, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-08-live-scoring-error-flow-design.md`

---

## File Map

**Backend:**
- Modify: `backend/src/main/java/com/softball/domain/model/AtBatResult.java` — Enum + Helper-Methods
- Modify: `backend/src/main/java/com/softball/domain/model/BattingStats.java` — Record-Feld `reachedOnError`
- Modify: `backend/src/main/java/com/softball/domain/service/BattingStatsCalculator.java` — Switch-Case + Counter
- Modify: `backend/src/main/java/com/softball/adapter/dto/PlayerBattingStatsResponse.java` — DTO-Feld + `from()` mapping
- Modify: `backend/src/test/java/com/softball/domain/service/BattingStatsCalculatorTest.java` — neue Tests

**Frontend:**
- Modify: `frontend/src/types/index.ts` — Enum + Label + DTO-Feld
- Modify: `frontend/src/components/scoring/ActionButtons.tsx` — Reihe 2 auf 3-col + ERROR-Button
- Modify: `frontend/src/components/scoring/ScoringPage.tsx` — `advanceBases`-Switch, Handler-Branch, Flash-Animation

---

## Task 1: Domain — AtBatResult Enum erweitern

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/model/AtBatResult.java`

- [ ] **Step 1: Enum-Wert hinzufügen + Helper-Methods erweitern**

```java
package com.softball.domain.model;

public enum AtBatResult {
    SINGLE, DOUBLE, TRIPLE, HOMERUN, WALK, HIT_BY_PITCH, STRIKEOUT, OUT, REACHED_ON_ERROR;

    public boolean isHit() {
        return this == SINGLE || this == DOUBLE || this == TRIPLE || this == HOMERUN;
    }

    /** At-Bat zählt für die Trefferquote. Walks und HBP zählen nicht. ROE zählt als AB (BA-Penalty). */
    public boolean countsAsAtBat() {
        return this != WALK && this != HIT_BY_PITCH;
    }

    public boolean reachedBase() {
        return isHit() || this == WALK || this == HIT_BY_PITCH || this == REACHED_ON_ERROR;
    }

    public int totalBases() {
        return switch (this) {
            case SINGLE -> 1;
            case DOUBLE -> 2;
            case TRIPLE -> 3;
            case HOMERUN -> 4;
            default -> 0;
        };
    }

    public boolean isOut() {
        return this == STRIKEOUT || this == OUT;
    }

    public String displayNameDe() {
        return switch (this) {
            case SINGLE -> "Single";
            case DOUBLE -> "Double";
            case TRIPLE -> "Triple";
            case HOMERUN -> "Homerun";
            case WALK -> "Walk";
            case HIT_BY_PITCH -> "Hit-by-Pitch";
            case STRIKEOUT -> "Strikeout";
            case OUT -> "Aus";
            case REACHED_ON_ERROR -> "Reached on Error";
        };
    }
}
```

- [ ] **Step 2: Build-Check (kompiliert ohne Calculator-Anpassung erstmal nicht — exhaustive switch)**

Run: `cd backend && ./mvnw compile -q`
Expected: FAIL — `BattingStatsCalculator.calculateForPlayer` switch ist nicht exhaustive (Java compile error für `REACHED_ON_ERROR` fehlt).

Das ist erwartet — wird in Task 3 gefixt. Wir machen Task 2 + 3 als zusammenhängenden Slice.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/AtBatResult.java
git commit -m "✨ Domain: AtBatResult.REACHED_ON_ERROR + Helper-Methods"
```

---

## Task 2: Domain — BattingStats Record erweitern

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/model/BattingStats.java`

- [ ] **Step 1: Feld `reachedOnError` ergänzen**

```java
package com.softball.domain.model;

import java.math.BigDecimal;
import java.math.RoundingMode;

public record BattingStats(
    Long playerId,
    String playerName,
    int plateAppearances,
    int atBats,
    int hits,
    int singles,
    int doubles,
    int triples,
    int homeRuns,
    int walks,
    int hitByPitch,
    int strikeouts,
    int outs,
    int reachedOnError,
    int stolenBases,
    int caughtStealing,
    int runsBattedIn,
    int totalBases,
    BigDecimal battingAverage,
    BigDecimal onBasePct,
    BigDecimal sluggingPct
) {
    public BigDecimal ops() {
        return onBasePct.add(sluggingPct).setScale(3, RoundingMode.HALF_UP);
    }
}
```

- [ ] **Step 2: Commit zusammen mit Task 3 (compile bricht sonst)**

Skip — Calculator + DTO ziehen mit nach.

---

## Task 3: Domain — BattingStatsCalculator Switch + Counter

**Files:**
- Modify: `backend/src/main/java/com/softball/domain/service/BattingStatsCalculator.java`

- [ ] **Step 1: Failing Test schreiben**

In `backend/src/test/java/com/softball/domain/service/BattingStatsCalculatorTest.java` neuen Test direkt nach `walksDoNotCountAsAtBat` einfügen:

```java
    @Test
    void reachedOnError_countsAsAtBatNoHit() {
        final List<AtBat> atBats = List.of(
            atBat(AtBatResult.SINGLE),
            atBat(AtBatResult.REACHED_ON_ERROR),
            atBat(AtBatResult.REACHED_ON_ERROR),
            atBat(AtBatResult.OUT)
        );

        final BattingStats s = calculator.calculateForPlayer(hung, atBats, List.of());

        assertThat(s.plateAppearances()).isEqualTo(4);
        assertThat(s.atBats()).isEqualTo(4);          // ROE zählt als AB
        assertThat(s.hits()).isEqualTo(1);            // nur Single
        assertThat(s.reachedOnError()).isEqualTo(2);
        assertThat(s.outs()).isEqualTo(1);
        // BA = 1/4 = 0.250 (BA-Penalty wirkt)
        assertThat(s.battingAverage()).isEqualByComparingTo("0.250");
        // OBP = (1 hit + 0 BB + 0 HBP) / 4 PA = 0.250 (ROE zählt NICHT als On-Base)
        assertThat(s.onBasePct()).isEqualByComparingTo("0.250");
        // SLG = 1 TB / 4 AB = 0.250
        assertThat(s.sluggingPct()).isEqualByComparingTo("0.250");
    }
```

- [ ] **Step 2: Test ausführen, FAIL erwarten**

Run: `cd backend && ./mvnw test -Dtest=BattingStatsCalculatorTest#reachedOnError_countsAsAtBatNoHit -q`
Expected: FAIL (compile error: `REACHED_ON_ERROR` switch missing + `reachedOnError()` method missing on record).

- [ ] **Step 3: Calculator anpassen**

In `BattingStatsCalculator.java`:

a) Neue lokale Variable nach `int outs = 0;`:
```java
        int reachedOnError = 0;
```

b) Switch-Case in `for (final AtBat ab : playerAtBats)` Schleife erweitern — neuer Case nach `case OUT -> outs++;`:
```java
                case REACHED_ON_ERROR -> reachedOnError++;
```

c) Im `return new BattingStats(...)` den neuen Wert an korrekter Position einfügen (nach `outs`, vor `stolenBases`):
```java
        return new BattingStats(
            player.getId(), player.getName(),
            plateAppearances, atBats, hits,
            singles, doubles, triples, homeRuns,
            walks, hbp, strikeouts, outs,
            reachedOnError,
            stolenBases, caughtStealing, rbi, totalBases,
            ba, obp, slg
        );
```

- [ ] **Step 4: Test ausführen, PASS erwarten**

Run: `cd backend && ./mvnw test -Dtest=BattingStatsCalculatorTest -q`
Expected: PASS — alle Tests inkl. neuer ROE-Test grün.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/BattingStats.java \
        backend/src/main/java/com/softball/domain/service/BattingStatsCalculator.java \
        backend/src/test/java/com/softball/domain/service/BattingStatsCalculatorTest.java
git commit -m "✨ Stats: reachedOnError-Counter im BattingStatsCalculator"
```

---

## Task 4: Adapter — PlayerBattingStatsResponse DTO

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/dto/PlayerBattingStatsResponse.java`

- [ ] **Step 1: Feld + Mapping ergänzen**

```java
package com.softball.adapter.dto;

import com.softball.domain.model.BattingStats;

import java.math.BigDecimal;

public record PlayerBattingStatsResponse(
    Long playerId,
    String playerName,
    int plateAppearances,
    int atBats,
    int hits,
    int singles,
    int doubles,
    int triples,
    int homeRuns,
    int walks,
    int hitByPitch,
    int strikeouts,
    int outs,
    int reachedOnError,
    int stolenBases,
    int caughtStealing,
    int runsBattedIn,
    int totalBases,
    BigDecimal battingAverage,
    BigDecimal onBasePct,
    BigDecimal sluggingPct,
    BigDecimal ops
) {
    public static PlayerBattingStatsResponse from(final BattingStats s) {
        return new PlayerBattingStatsResponse(
            s.playerId(), s.playerName(),
            s.plateAppearances(), s.atBats(), s.hits(),
            s.singles(), s.doubles(), s.triples(), s.homeRuns(),
            s.walks(), s.hitByPitch(), s.strikeouts(), s.outs(),
            s.reachedOnError(),
            s.stolenBases(), s.caughtStealing(), s.runsBattedIn(), s.totalBases(),
            s.battingAverage(), s.onBasePct(), s.sluggingPct(), s.ops()
        );
    }
}
```

- [ ] **Step 2: Build-Check**

Run: `cd backend && ./mvnw compile -q`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/PlayerBattingStatsResponse.java
git commit -m "✨ DTO: reachedOnError in PlayerBattingStatsResponse"
```

---

## Task 5: Frontend Types — AtBatResult + Label + Stats-DTO

**Files:**
- Modify: `frontend/src/types/index.ts:268-271` (Enum)
- Modify: `frontend/src/types/index.ts:342-364` (PlayerBattingStatsResponse)
- Modify: `frontend/src/types/index.ts:366` (Labels)

- [ ] **Step 1: Enum erweitern**

Ersetze:
```ts
export type AtBatResult =
  | 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOMERUN'
  | 'WALK' | 'HIT_BY_PITCH'
  | 'STRIKEOUT' | 'OUT'
```
durch:
```ts
export type AtBatResult =
  | 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOMERUN'
  | 'WALK' | 'HIT_BY_PITCH'
  | 'STRIKEOUT' | 'OUT'
  | 'REACHED_ON_ERROR'
```

- [ ] **Step 2: Label-Map erweitern**

In `AT_BAT_RESULT_LABELS` neuen Eintrag ergänzen (alphabetisch / nach OUT):
```ts
  REACHED_ON_ERROR: 'Reached on Error',
```

- [ ] **Step 3: PlayerBattingStatsResponse-Feld**

Im Interface `PlayerBattingStatsResponse` Feld `reachedOnError` zwischen `outs` und `stolenBases` einfügen:
```ts
  outs: number
  reachedOnError: number
  stolenBases: number
```

- [ ] **Step 4: Type-Check**

Run: `cd frontend && npx tsc --noEmit`
Expected: FAIL — `advanceBases` switch in ScoringPage.tsx ist nicht exhaustive für neuen Result-Wert.

Erwartet, wird in Task 7 gefixt. ActionButtons (Task 6) nutzt nur subset → kompiliert.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "✨ Types: REACHED_ON_ERROR + Stats-Feld"
```

---

## Task 6: Frontend ActionButtons — ERROR-Button

**Files:**
- Modify: `frontend/src/components/scoring/ActionButtons.tsx`

- [ ] **Step 1: Reihe 2 von 2-col auf 3-col + ERROR-Button**

Ersetze den Block:
```tsx
            {/* Reihe 2: 2 Secondary Buttons (60px) */}
            <div className="grid grid-cols-2 gap-2">
              <SecondaryButton color="sky" label="WALK" onClick={() => handleRecord('WALK')} disabled={disabled} />
              <SecondaryButton color="amber" label="HBP" subtitle="Hit-by-Pitch" onClick={() => handleRecord('HIT_BY_PITCH')} disabled={disabled} />
            </div>
```
durch:
```tsx
            {/* Reihe 2: 3 Secondary Buttons (60px) */}
            <div className="grid grid-cols-3 gap-2">
              <SecondaryButton color="sky" label="WALK" onClick={() => handleRecord('WALK')} disabled={disabled} />
              <SecondaryButton color="amber" label="HBP" subtitle="Hit-by-Pitch" onClick={() => handleRecord('HIT_BY_PITCH')} disabled={disabled} />
              <SecondaryButton color="rose" label="ERROR" subtitle="Reached on Error" onClick={() => handleRecord('REACHED_ON_ERROR')} disabled={disabled} />
            </div>
```

- [ ] **Step 2: COLOR_CLASSES um `rose`-Variante erweitern**

In der Konstante `COLOR_CLASSES` ergänzen:
```ts
  rose: 'bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white',
```

(`rose-700` für Defense-Fehler-Akzent — distinct von amber-HBP, klar als negatives Event lesbar.)

- [ ] **Step 3: Manueller Visual-Check**

Run: `cd frontend && npm run dev`
Browser: localhost:5173 → Spieltag → Live Scoren → prüfe 3-Button-Reihe.

ERROR-Button sichtbar zwischen WALK und HBP. Tap löst Record aus (Backend antwortet noch mit Compile-Fehler? Nein — Backend ist deployed nach Task 4).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/scoring/ActionButtons.tsx
git commit -m "✨ Live-Scoring: ERROR-Button in Reihe 2"
```

---

## Task 7: Frontend ScoringPage — advanceBases + Flash

**Files:**
- Modify: `frontend/src/components/scoring/ScoringPage.tsx`

- [ ] **Step 1: `advanceBases`-Switch erweitern**

Ab Zeile ~1922 den `case 'WALK': case 'HIT_BY_PITCH': { ... }`-Block kopieren und für ROE adaptieren. Ersetze:

```tsx
    case 'WALK':
    case 'HIT_BY_PITCH': {
      // Force-Advance: nur wenn bases vor Batter besetzt sind
      const next: BaseStateDto = { first: batterId, second: state.second, third: state.third }
      if (state.first != null) {
        next.second = state.first
        if (state.second != null) {
          next.third = state.second
          // Runner von 3B scort — wird beim countScored erkannt
        }
      }
      return next
    }
```

durch:

```tsx
    case 'WALK':
    case 'HIT_BY_PITCH':
    case 'REACHED_ON_ERROR': {
      // Force-Advance: nur wenn bases vor Batter besetzt sind.
      // ROE verhält sich mechanisch wie Walk (Batter→1B, forced runners +1).
      const next: BaseStateDto = { first: batterId, second: state.second, third: state.third }
      if (state.first != null) {
        next.second = state.first
        if (state.second != null) {
          next.third = state.second
          // Runner von 3B scort — wird beim countScored erkannt
        }
      }
      return next
    }
```

- [ ] **Step 2: Type-Check, PASS erwarten**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS — Switch jetzt exhaustive.

- [ ] **Step 3: errorFlash-State**

Suche `walkFlash`-State (~Zeile 52):
```tsx
  const [walkFlash, setWalkFlash] = useState<{ batter: string; runsScored: number } | null>(null)
```
Direkt darunter neuen State:
```tsx
  const [errorFlash, setErrorFlash] = useState<{ batter: string; runsScored: number } | null>(null)
```

- [ ] **Step 4: Handler-Branch in `handleRecord`**

Suche den Block (~Zeile 227–231):
```tsx
      } else if (result === 'WALK') {
        if (!reducedMotion) {
          setWalkFlash({ batter: batterNameSnapshot, runsScored })
          setTimeout(() => setWalkFlash(null), 1700)
        }
      } else if (result === 'STRIKEOUT') {
```
Ergänze ROE-Branch zwischen WALK und STRIKEOUT:
```tsx
      } else if (result === 'WALK') {
        if (!reducedMotion) {
          setWalkFlash({ batter: batterNameSnapshot, runsScored })
          setTimeout(() => setWalkFlash(null), 1700)
        }
      } else if (result === 'REACHED_ON_ERROR') {
        if (!reducedMotion) {
          setErrorFlash({ batter: batterNameSnapshot, runsScored })
          setTimeout(() => setErrorFlash(null), 1700)
        }
      } else if (result === 'STRIKEOUT') {
```

Außerdem die "skip einheitliche Pill"-Bedingung (~Zeile 250) erweitern:
```tsx
      if (result !== 'HOMERUN' && result !== 'HIT_BY_PITCH' && result !== 'WALK' && result !== 'REACHED_ON_ERROR') {
```

- [ ] **Step 5: Flash-JSX nach walkFlash-Block einfügen**

Suche das walkFlash-JSX (~Zeile 1487–1538, Block beginnt mit Kommentar `{/* Walk — Scorecard "BB" Notation ... */}`). Direkt NACH dem closing `</AnimatePresence>` dieses Blocks (vor `{/* Steal Pill ... */}`) folgenden Block einfügen:

```tsx
      {/* Reached on Error — Scorecard "E" Notation, rose-Akzent */}
      <AnimatePresence>
        {errorFlash && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
          >
            <div className="relative bg-rose-800 text-white pl-3 pr-5 py-2.5 rounded-xl shadow-xl flex items-center gap-3 border border-white/15 overflow-hidden">
              <motion.span
                className="font-display font-black text-3xl text-cream-50 leading-none relative"
                style={{ WebkitTextStroke: '1px var(--color-softball-red-500)' }}
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.15, 1, 1.05, 1] }}
                transition={{ duration: 0.9, times: [0, 0.2, 0.45, 0.7, 1], ease: 'easeOut' }}
              >
                E
              </motion.span>

              <div className="relative">
                <div className="font-display text-[10px] font-bold tracking-widest uppercase text-white/60">Reached on Error</div>
                <div className="font-display text-base font-bold tracking-wider uppercase">
                  {errorFlash.batter}
                </div>
              </div>

              {errorFlash.runsScored > 0 && (
                <motion.div
                  initial={{ scale: 0, rotate: 30, opacity: 0 }}
                  animate={{ scale: [0, 1.3, 1], rotate: 12, opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.4, ease: 'backOut' }}
                  className="bg-softball-red-600 text-white font-display font-black text-sm px-2 py-1 rounded-md tracking-wider shadow-lg border border-cream-50/30 relative"
                >
                  +{errorFlash.runsScored} {errorFlash.runsScored === 1 ? 'RUN' : 'RUNS'}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
```

- [ ] **Step 6: Manueller Test**

Browser: ERROR-Button tippen mit Bases Loaded.
- Batter erscheint auf 1B
- Forced Runners rücken vor (1B→2B, 2B→3B, 3B→Home)
- 1 Run scort
- Flash-Pill `E — Reached on Error` mit `+1 RUN` Sticker sichtbar 1.7s
- AB-Liste zeigt neuen Eintrag mit Result `Reached on Error`
- Player-Stats: PA+1, AB+1, kein Hit, BA sinkt korrekt

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/scoring/ScoringPage.tsx
git commit -m "✨ Live-Scoring: ROE advanceBases + Flash-Animation"
```

---

## Task 8: Final Build + Test

- [ ] **Step 1: Backend kompletter Test-Suite**

Run: `cd backend && ./mvnw test -q`
Expected: alle Tests PASS

- [ ] **Step 2: Frontend Type-Check + Build**

Run: `cd frontend && npx tsc --noEmit && npm run build`
Expected: alle Types OK, Build erfolgreich

- [ ] **Step 3: End-to-End-Smoke-Test**

Browser: Spieltag → Live Scoren → komplettes Game-Szenario:
1. Bases Loaded aufbauen (3× Single)
2. ERROR-Button → Run scort, Bases Loaded bleibt (Batter→1B)
3. Korrektur via "Korrigieren"-Sheet möglich
4. Undo entfernt ROE-Eintrag korrekt

- [ ] **Step 4: Stats verifizieren**

Statistik-Page öffnen → Spieler mit ROE prüfen:
- AB enthält ROE
- Hits enthält ROE NICHT
- BA = Hits / AB (sinkt durch ROE)
- OBP = (Hits + BB + HBP) / PA (sinkt durch ROE)

---

## Self-Review Checklist (für Implementierer)

- [ ] Spec-Coverage: alle Punkte aus `2026-05-08-live-scoring-error-flow-design.md` abgedeckt? (UI ✓, Backend Enum ✓, Stats ✓, Flash ✓, kein WP/PB ✓, kein Fielder-Picker ✓)
- [ ] Keine Placeholder im Code
- [ ] Frequent Commits (jeder Task = eigener Commit)
- [ ] Type-Consistency: `reachedOnError` Feld in BattingStats, DTO, TS-Interface — Reihenfolge gleich (zwischen `outs` und `stolenBases`)

---

## Notizen

- JPA-Migration nicht nötig — `result`-Column ist `varchar(32)`, neue Enum-Werte werden direkt akzeptiert.
- WP/PB nicht implementiert — bestehender Steal-Tap + Overthrow-Button reicht (siehe Spec, Nicht-Ziele).
- Fielder-Picker (E-Position) nicht im Live-Scoring — Spielbogen bleibt analytische Quelle.
