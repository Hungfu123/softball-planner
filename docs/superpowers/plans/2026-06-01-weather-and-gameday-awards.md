# Wetter pro Spieltag + Spieltags-Auszeichnungen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dashboard zeigt für den nächsten Spieltag eine kompakte Wetter-Pill (Open-Meteo) und für fertige Spieltage automatische Auszeichnungen (MVP + Themen-Titel) aus den Batting-Stats.

**Architecture:** Onion/Hexagonal. Awards: reiner Domain-Calculator + dünner Application-Service + eigener Controller, liest bestehende Per-Spieltag-Batting-Stats. Wetter: zwei Domain-Out-Ports (Geocoding, Forecast) mit Open-Meteo-Adaptern (RestClient), Application-Service mit In-Memory-Cache, eigener Controller hinter Feature-Flag. Beide Frontend-Features sind nice-to-have und rendern bei fehlenden Daten nichts.

**Tech Stack:** Java 21, Spring Boot 3.4.3 (RestClient aus `spring-boot-starter-web`), JUnit 5 + Mockito + Spring `MockRestServiceServer` (alle in `spring-boot-starter-test`), React 19 + TypeScript, lucide-react (^1.11.0, bereits in deps), Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-06-01-weather-and-gameday-awards-design.md`

**Hinweis Tests:** Domain-Calculator-Tests sind pures JUnit (kein Docker). Adapter-Tests nutzen `MockRestServiceServer` (kein Live-Netzwerk, kein Docker). WeatherService-Test nutzt Mockito-Mocks der Ports. Backend-Build verifizieren mit `./mvnw test -s .mvn/local-settings.xml`. Frontend mit `npm run build`. Diese Features berühren NICHT den Live-Scoring-Critical-Path → keine Playwright-E2E nötig.

**Frontend-Design-Komponenten:** `WeatherPill` (Task 13) und `AwardBadges` (Task 6) mit dem `frontend-design`-Skill bauen — siehe Hinweis in den jeweiligen Tasks.

---

## File Structure

### Feature A — Awards
- Create `backend/src/main/java/com/softball/domain/model/AwardType.java` — Enum der Titel
- Create `backend/src/main/java/com/softball/domain/model/Award.java` — Domain-Record (Ergebnis)
- Create `backend/src/main/java/com/softball/domain/service/GamedayAwardCalculator.java` — pure Auswahl-Logik
- Create `backend/src/test/java/com/softball/domain/service/GamedayAwardCalculatorTest.java`
- Create `backend/src/main/java/com/softball/application/AwardService.java` — orchestriert Stats → Calculator
- Create `backend/src/main/java/com/softball/adapter/dto/AwardResponse.java` — Response-DTO
- Create `backend/src/main/java/com/softball/adapter/in/web/AwardController.java` — `GET /api/gamedays/{id}/awards`
- Modify `frontend/src/types.ts` (oder `@/types`) — `AwardResponse` Typ
- Modify `frontend/src/api/client.ts` — `getGameDayAwards`
- Create `frontend/src/components/dashboard/AwardBadges.tsx`
- Modify `frontend/src/components/dashboard/HeroNextGameDay.tsx` — Badges bei `past`
- Modify `frontend/src/components/dashboard/GameDayCard.tsx` — Badges bei fertigem Spieltag

### Feature B — Wetter
- Create `backend/src/main/java/com/softball/domain/model/Coordinates.java`
- Create `backend/src/main/java/com/softball/domain/model/DayForecast.java`
- Create `backend/src/main/java/com/softball/domain/port/out/GeocodingPort.java`
- Create `backend/src/main/java/com/softball/domain/port/out/WeatherForecastPort.java`
- Create `backend/src/main/java/com/softball/adapter/out/weather/OpenMeteoGeocodingAdapter.java`
- Create `backend/src/main/java/com/softball/adapter/out/weather/OpenMeteoWeatherAdapter.java`
- Create `backend/src/test/java/com/softball/adapter/out/weather/OpenMeteoGeocodingAdapterTest.java`
- Create `backend/src/test/java/com/softball/adapter/out/weather/OpenMeteoWeatherAdapterTest.java`
- Create `backend/src/main/java/com/softball/application/WeatherService.java` — Cache + Orchestrierung
- Create `backend/src/test/java/com/softball/application/WeatherServiceTest.java`
- Create `backend/src/main/java/com/softball/adapter/dto/WeatherResponse.java`
- Create `backend/src/main/java/com/softball/adapter/in/web/WeatherController.java` — `GET /api/gamedays/{id}/weather`
- Modify `backend/src/main/resources/application.properties` — Feature-Flag
- Modify `frontend/src/types.ts` — `WeatherResponse` Typ
- Modify `frontend/src/api/client.ts` — `getGameDayWeather` (null bei 204)
- Create `frontend/src/components/dashboard/WeatherPill.tsx`
- Modify `frontend/src/components/dashboard/HeroNextGameDay.tsx` — Pill bei `today`/`upcoming`

---

# Feature A — Spieltags-Auszeichnungen

Self-contained, pure Domain-Logik, keine externe Abhängigkeit. Zuerst.

## Task 1: Domain — AwardType + Award

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/AwardType.java`
- Create: `backend/src/main/java/com/softball/domain/model/Award.java`

- [ ] **Step 1: AwardType-Enum anlegen**

`backend/src/main/java/com/softball/domain/model/AwardType.java`:
```java
package com.softball.domain.model;

/** Titel, die an einem Spieltag automatisch vergeben werden können. */
public enum AwardType {
    MVP,
    POWER,
    SPEED,
    ON_BASE
}
```

- [ ] **Step 2: Award-Record anlegen**

`backend/src/main/java/com/softball/domain/model/Award.java`:
```java
package com.softball.domain.model;

/**
 * Eine vergebene Auszeichnung für einen Spieltag.
 * displayValue = menschenlesbarer Stat-Hinweis (z.B. "OPS 1.250", "8 Bases").
 */
public record Award(
    AwardType type,
    Long playerId,
    String playerName,
    String displayValue
) {}
```

- [ ] **Step 3: Kompilieren**

Run: `cd backend && ./mvnw -q -o compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS (falls offline-cache fehlt, ohne `-o`).

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/AwardType.java backend/src/main/java/com/softball/domain/model/Award.java
git commit -m "✨ Award-Domain-Model (AwardType, Award)"
```

---

## Task 2: Domain — GamedayAwardCalculator (TDD)

Reine Auswahl-Logik. Input `List<BattingStats>`, Output `List<Award>`.

**Regeln:**
- MVP: höchster Composite `totalBases + runsBattedIn + walks + stolenBases`. Nur Spieler mit `plateAppearances >= 2`. Tiebreak: Composite desc → OPS desc → PA desc → playerId asc. Immer vergeben, sofern ein qualifizierter Spieler existiert. displayValue = `"OPS " + ops` (3 Nachkommastellen).
- POWER: meiste `totalBases`. Nur wenn ein Extra-Base-Hit existiert (`doubles+triples+homeRuns > 0` beim Sieger). Tiebreak totalBases desc → playerId asc. displayValue = `totalBases + " Bases"`.
- SPEED: meiste `stolenBases`, nur wenn `> 0`. Tiebreak SB desc → playerId asc. displayValue = `stolenBases + " SB"`.
- ON_BASE: beste `onBasePct`, `plateAppearances >= 2`, **nur wenn Spieler ≠ MVP-Spieler** (sonst weglassen). Tiebreak OBP desc → PA desc → playerId asc. displayValue = `"OBP " + onBasePct`.

**Files:**
- Test: `backend/src/test/java/com/softball/domain/service/GamedayAwardCalculatorTest.java`
- Create: `backend/src/main/java/com/softball/domain/service/GamedayAwardCalculator.java`

- [ ] **Step 1: Failing-Test schreiben**

`backend/src/test/java/com/softball/domain/service/GamedayAwardCalculatorTest.java`:
```java
package com.softball.domain.service;

import com.softball.domain.model.Award;
import com.softball.domain.model.AwardType;
import com.softball.domain.model.BattingStats;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class GamedayAwardCalculatorTest {

    private final GamedayAwardCalculator calc = new GamedayAwardCalculator();

    /** Helper: BattingStats mit den für Awards relevanten Feldern. */
    private BattingStats stats(long id, String name, int pa, int tb, int rbi,
                               int bb, int sb, int xbh, String obp, String ops) {
        // xbh wird auf doubles gelegt (reicht für Power-Schwelle), restliche Felder neutral.
        BigDecimal obpBd = new BigDecimal(obp);
        BigDecimal slg = new BigDecimal(ops).subtract(obpBd); // ops = obp + slg
        return new BattingStats(
            id, name,
            pa,            // plateAppearances
            pa,            // atBats
            tb - 2 * xbh,  // hits (grob; für Awards irrelevant außer Konsistenz)
            0,             // singles
            xbh,           // doubles
            0,             // triples
            0,             // homeRuns
            bb,            // walks
            0,             // hitByPitch
            0,             // strikeouts
            0,             // outs
            0,             // reachedOnError
            sb,            // stolenBases
            0,             // caughtStealing
            0,             // pickoffs
            rbi,           // runsBattedIn
            tb,            // totalBases
            BigDecimal.ZERO,   // battingAverage (für Awards irrelevant)
            obpBd,             // onBasePct
            slg                // sluggingPct  → ops() == obp+slg
        );
    }

    private Map<AwardType, Award> byType(List<Award> awards) {
        return awards.stream().collect(Collectors.toMap(Award::type, a -> a));
    }

    @Test
    void emptyStats_noAwards() {
        assertThat(calc.calculate(List.of())).isEmpty();
    }

    @Test
    void mvp_picksHighestComposite() {
        // A: composite = 8+3+1+0 = 12 ; B: 4+0+0+2 = 6
        var a = stats(1, "Anna", 3, 8, 3, 1, 0, 2, "0.500", "1.300");
        var b = stats(2, "Ben", 3, 4, 0, 0, 2, 1, "0.400", "0.800");
        var awards = byType(calc.calculate(List.of(a, b)));
        assertThat(awards.get(AwardType.MVP).playerId()).isEqualTo(1L);
        assertThat(awards.get(AwardType.MVP).displayValue()).isEqualTo("OPS 1.300");
    }

    @Test
    void mvp_requiresMinTwoPa() {
        var only = stats(1, "Solo", 1, 12, 5, 0, 0, 3, "0.900", "2.000");
        assertThat(calc.calculate(List.of(only))).isEmpty();
    }

    @Test
    void power_onlyWhenExtraBaseHitExists() {
        // Sieger nach TB hat keinen XBH → kein Power-Award
        var a = stats(1, "Singles", 4, 4, 0, 0, 0, 0, "0.400", "0.800");
        var awards = byType(calc.calculate(List.of(a)));
        assertThat(awards).doesNotContainKey(AwardType.POWER);
    }

    @Test
    void speed_onlyWhenStolenBasePositive() {
        var a = stats(1, "Slow", 3, 3, 0, 0, 0, 1, "0.400", "0.900");
        assertThat(byType(calc.calculate(List.of(a)))).doesNotContainKey(AwardType.SPEED);
    }

    @Test
    void onBase_droppedWhenSameAsMvp() {
        // Ein einziger Spieler ist sowohl Composite- als auch OBP-Sieger
        var a = stats(1, "Dom", 3, 8, 3, 2, 0, 2, "0.700", "1.400");
        var awards = byType(calc.calculate(List.of(a)));
        assertThat(awards.get(AwardType.MVP).playerId()).isEqualTo(1L);
        assertThat(awards).doesNotContainKey(AwardType.ON_BASE);
    }

    @Test
    void onBase_awardedToDifferentPlayer() {
        var mvp = stats(1, "Power", 3, 9, 4, 0, 0, 3, "0.450", "1.200");
        var obp = stats(2, "Patient", 4, 2, 0, 3, 0, 0, "0.750", "0.900");
        var awards = byType(calc.calculate(List.of(mvp, obp)));
        assertThat(awards.get(AwardType.MVP).playerId()).isEqualTo(1L);
        assertThat(awards.get(AwardType.ON_BASE).playerId()).isEqualTo(2L);
        assertThat(awards.get(AwardType.ON_BASE).displayValue()).isEqualTo("OBP 0.750");
    }
}
```

- [ ] **Step 2: Test laufen → muss fehlschlagen (Klasse fehlt)**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=GamedayAwardCalculatorTest`
Expected: Compile-Fehler / FAIL — `GamedayAwardCalculator` existiert nicht.

- [ ] **Step 3: Calculator implementieren**

`backend/src/main/java/com/softball/domain/service/GamedayAwardCalculator.java`:
```java
package com.softball.domain.service;

import com.softball.domain.model.Award;
import com.softball.domain.model.AwardType;
import com.softball.domain.model.BattingStats;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Pure Auswahl-Logik für Spieltags-Auszeichnungen. Kein Spring, keine I/O.
 * Reihenfolge des Ergebnisses: MVP, POWER, SPEED, ON_BASE (jeweils nur falls qualifiziert).
 */
public class GamedayAwardCalculator {

    private static final int MIN_PA = 2;

    public List<Award> calculate(final List<BattingStats> stats) {
        final List<Award> result = new ArrayList<>();
        if (stats == null || stats.isEmpty()) {
            return result;
        }

        final Optional<BattingStats> mvp = pickMvp(stats);
        mvp.ifPresent(s -> result.add(new Award(
            AwardType.MVP, s.playerId(), s.playerName(), "OPS " + s.ops().toPlainString())));

        pickPower(stats).ifPresent(s -> result.add(new Award(
            AwardType.POWER, s.playerId(), s.playerName(), s.totalBases() + " Bases")));

        pickSpeed(stats).ifPresent(s -> result.add(new Award(
            AwardType.SPEED, s.playerId(), s.playerName(), s.stolenBases() + " SB")));

        final Long mvpId = mvp.map(BattingStats::playerId).orElse(null);
        pickOnBase(stats, mvpId).ifPresent(s -> result.add(new Award(
            AwardType.ON_BASE, s.playerId(), s.playerName(), "OBP " + s.onBasePct().toPlainString())));

        return result;
    }

    private int composite(final BattingStats s) {
        return s.totalBases() + s.runsBattedIn() + s.walks() + s.stolenBases();
    }

    private boolean hasExtraBaseHit(final BattingStats s) {
        return s.doubles() + s.triples() + s.homeRuns() > 0;
    }

    private Optional<BattingStats> pickMvp(final List<BattingStats> stats) {
        return stats.stream()
            .filter(s -> s.plateAppearances() >= MIN_PA)
            .max(Comparator
                .comparingInt(this::composite)
                .thenComparing(BattingStats::ops)
                .thenComparingInt(BattingStats::plateAppearances)
                .thenComparing(Comparator.comparingLong(BattingStats::playerId).reversed()));
    }

    private Optional<BattingStats> pickPower(final List<BattingStats> stats) {
        return stats.stream()
            .max(Comparator
                .comparingInt(BattingStats::totalBases)
                .thenComparing(Comparator.comparingLong(BattingStats::playerId).reversed()))
            .filter(s -> s.totalBases() > 0 && hasExtraBaseHit(s));
    }

    private Optional<BattingStats> pickSpeed(final List<BattingStats> stats) {
        return stats.stream()
            .filter(s -> s.stolenBases() > 0)
            .max(Comparator
                .comparingInt(BattingStats::stolenBases)
                .thenComparing(Comparator.comparingLong(BattingStats::playerId).reversed()));
    }

    private Optional<BattingStats> pickOnBase(final List<BattingStats> stats, final Long excludeId) {
        return stats.stream()
            .filter(s -> s.plateAppearances() >= MIN_PA)
            .filter(s -> excludeId == null || !s.playerId().equals(excludeId))
            .max(Comparator
                .comparing(BattingStats::onBasePct)
                .thenComparingInt(BattingStats::plateAppearances)
                .thenComparing(Comparator.comparingLong(BattingStats::playerId).reversed()));
    }
}
```

Hinweis: `.reversed()` auf den playerId-Comparator innerhalb eines `max()` macht den **kleinsten** playerId zum Tiebreak-Sieger (gewünscht).

- [ ] **Step 4: Test laufen → grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=GamedayAwardCalculatorTest`
Expected: PASS (7 Tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/domain/service/GamedayAwardCalculator.java backend/src/test/java/com/softball/domain/service/GamedayAwardCalculatorTest.java
git commit -m "✨ GamedayAwardCalculator: MVP + Power/Speed/On-Base Titel"
```

---

## Task 3: Application — AwardService

**Files:**
- Create: `backend/src/main/java/com/softball/application/AwardService.java`

- [ ] **Step 1: Service schreiben**

`AwardService` ruft die vorhandene `BattingStatsService.getGameDayStats(id)` (liefert `List<PlayerBattingStatsResponse>`). Calculator arbeitet aber auf `BattingStats` (Domain). Um die Schicht sauber zu halten, fügen wir `BattingStatsService` eine domänennahe Methode hinzu, die `List<BattingStats>` liefert.

Zuerst prüfen, was `BattingStatsService.getGameDayStats` intern hat. Falls dort bereits `List<BattingStats>` aggregiert und erst am Ende zu DTO gemappt wird: neue package-sichtbare/öffentliche Methode `getGameDayBattingStats(Long): List<BattingStats>` extrahieren. Dann:

`backend/src/main/java/com/softball/application/AwardService.java`:
```java
package com.softball.application;

import com.softball.domain.model.Award;
import com.softball.domain.model.BattingStats;
import com.softball.domain.service.GamedayAwardCalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AwardService {

    private static final Logger log = LoggerFactory.getLogger(AwardService.class);

    private final BattingStatsService battingStatsService;
    private final GamedayAwardCalculator calculator = new GamedayAwardCalculator();

    public AwardService(final BattingStatsService battingStatsService) {
        this.battingStatsService = battingStatsService;
    }

    public List<Award> getGameDayAwards(final Long gameDayId) {
        final List<BattingStats> stats = battingStatsService.getGameDayBattingStats(gameDayId);
        final List<Award> awards = calculator.calculate(stats);
        log.info("Awards für GameDay {}: {} vergeben", gameDayId, awards.size());
        return awards;
    }
}
```

- [ ] **Step 2: `getGameDayBattingStats` in BattingStatsService bereitstellen**

`BattingStatsService.getGameDayStats(id)` liest aktuell `gameRepository.findByGameDayIdOrderByGameNumberAsc(gameDayId)` und aggregiert. Extrahiere die Aggregation in eine Methode, die `List<BattingStats>` zurückgibt, und mappe in `getGameDayStats` nur noch zu DTO:

Modify `backend/src/main/java/com/softball/application/BattingStatsService.java` — Methode `getGameDayStats` so umbauen (Beispiel, an vorhandene Aggregations-Hilfen anpassen):
```java
    public List<PlayerBattingStatsResponse> getGameDayStats(final Long gameDayId) {
        return getGameDayBattingStats(gameDayId).stream()
            .map(PlayerBattingStatsResponse::from)
            .toList();
    }

    /** Domänen-Aggregation pro Spieltag (für Awards & DTO-Wiederverwendung). */
    public List<BattingStats> getGameDayBattingStats(final Long gameDayId) {
        final List<Game> games = gameRepository.findByGameDayIdOrderByGameNumberAsc(gameDayId);
        // ... bestehende Aggregations-Logik, die bisher in getGameDayStats stand,
        //     liefert List<BattingStats> statt direkt zu mappen.
        return aggregateBattingStats(games); // vorhandenen Aggregations-Aufruf verwenden
    }
```
Den genauen Aggregations-Aufruf an die bestehende Implementierung anpassen (die DTO-Map `PlayerBattingStatsResponse::from` ist die einzige Änderung am Rückgabetyp). Importe für `BattingStats` ergänzen falls nötig.

- [ ] **Step 3: Backend kompilieren**

Run: `cd backend && ./mvnw -q compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/softball/application/AwardService.java backend/src/main/java/com/softball/application/BattingStatsService.java
git commit -m "✨ AwardService + getGameDayBattingStats extrahiert"
```

---

## Task 4: Adapter — AwardResponse DTO + AwardController

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/dto/AwardResponse.java`
- Create: `backend/src/main/java/com/softball/adapter/in/web/AwardController.java`

- [ ] **Step 1: DTO**

`backend/src/main/java/com/softball/adapter/dto/AwardResponse.java`:
```java
package com.softball.adapter.dto;

import com.softball.domain.model.Award;

public record AwardResponse(
    String type,
    Long playerId,
    String playerName,
    String displayValue
) {
    public static AwardResponse from(final Award a) {
        return new AwardResponse(a.type().name(), a.playerId(), a.playerName(), a.displayValue());
    }
}
```

- [ ] **Step 2: Controller**

`backend/src/main/java/com/softball/adapter/in/web/AwardController.java`:
```java
package com.softball.adapter.in.web;

import com.softball.adapter.dto.AwardResponse;
import com.softball.application.AwardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class AwardController {

    private final AwardService awardService;

    public AwardController(final AwardService awardService) {
        this.awardService = awardService;
    }

    @GetMapping("/api/gamedays/{gameDayId}/awards")
    public List<AwardResponse> getGameDayAwards(@PathVariable final Long gameDayId) {
        return awardService.getGameDayAwards(gameDayId).stream()
            .map(AwardResponse::from)
            .toList();
    }
}
```

- [ ] **Step 3: Voller Backend-Test-Lauf (Docker für Testcontainers an)**

Run: `docker compose up -d db && cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: PASS (inkl. neuem Calculator-Test, keine Regression).

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/AwardResponse.java backend/src/main/java/com/softball/adapter/in/web/AwardController.java
git commit -m "✨ GET /api/gamedays/{id}/awards"
```

---

## Task 5: Frontend — Award-Typ + Client

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api/client.ts`

- [ ] **Step 1: Typ ergänzen**

In `frontend/src/types.ts` (an passende Stelle, z.B. bei den Stats-Typen) einfügen:
```ts
export type AwardType = 'MVP' | 'POWER' | 'SPEED' | 'ON_BASE'

export interface AwardResponse {
  type: AwardType
  playerId: number
  playerName: string
  displayValue: string
}
```
(Falls Typen in `@/types/index.ts` o.ä. liegen — dort einfügen; Import-Pfad in client.ts entsprechend.)

- [ ] **Step 2: Client-Funktion**

In `frontend/src/api/client.ts` bei den GameDay-Funktionen ergänzen:
```ts
export const getGameDayAwards = (id: number) =>
  request<AwardResponse[]>(`/gamedays/${id}/awards`)
```
Import von `AwardResponse` oben im File sicherstellen.

- [ ] **Step 3: Typecheck/Build**

Run: `cd frontend && npm run build`
Expected: tsc + vite build ohne Fehler.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types.ts frontend/src/api/client.ts
git commit -m "✨ Frontend: AwardResponse Typ + getGameDayAwards"
```

---

## Task 6: Frontend — AwardBadges-Komponente (frontend-design)

**REQUIRED SUB-SKILL bei diesem Task:** `frontend-design` — die Badge-Reihe soll zum Editorial-Sports-Card-Stil des Dashboards passen (navy/softball-red, font-display, uppercase tracking). Vor dem Schreiben den Skill `frontend-design` invoken und den bestehenden Hero/GameDayCard-Stil als Referenz nehmen.

**Files:**
- Create: `frontend/src/components/dashboard/AwardBadges.tsx`

- [ ] **Step 1: Komponente schreiben**

Anforderungen:
- Props: `awards: AwardResponse[]`. Bei leerem Array `return null`.
- Icon-Mapping (lucide-react): `MVP→Trophy`, `POWER→Flame`, `SPEED→Wind`, `ON_BASE→Target`.
- Titel-Label (DE): `MVP→"MVP"`, `POWER→"Power"`, `SPEED→"Speed"`, `ON_BASE→"On-Base"`.
- Layout: kompakte horizontale Badge-Reihe (wrap auf Mobile). Pro Badge: Icon + Titel + Spielername; `displayValue` als kleiner Sekundärtext.
- Stil: konsistent mit `HeroNextGameDay` (font-display, `text-[10px]`/`text-[11px]`, uppercase tracking, rounded). MVP visuell hervorgehoben (z.B. softball-red/gold-Akzent), übrige dezenter.

Beispiel-Grundgerüst (frontend-design verfeinert Optik):
```tsx
import { Trophy, Flame, Wind, Target } from 'lucide-react'
import type { AwardResponse, AwardType } from '@/types'

const ICON: Record<AwardType, typeof Trophy> = {
  MVP: Trophy, POWER: Flame, SPEED: Wind, ON_BASE: Target,
}
const LABEL: Record<AwardType, string> = {
  MVP: 'MVP', POWER: 'Power', SPEED: 'Speed', ON_BASE: 'On-Base',
}

interface Props { awards: AwardResponse[] }

export function AwardBadges({ awards }: Props) {
  if (awards.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {awards.map(a => {
        const Icon = ICON[a.type]
        const isMvp = a.type === 'MVP'
        return (
          <div
            key={a.type}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 border ${
              isMvp
                ? 'bg-softball-red-600/20 border-softball-red-400/40 text-white'
                : 'bg-white/8 border-white/15 text-white/85'
            }`}
          >
            <Icon size={13} className="shrink-0" />
            <div className="leading-tight">
              <div className="font-display text-[10px] font-extrabold tracking-widest uppercase">
                {LABEL[a.type]} · {a.playerName}
              </div>
              <div className="text-[9px] text-white/55">{a.displayValue}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```
(Farbklassen je nach Hintergrund anpassen — auf hellem `GameDayCard`-Hintergrund navy-Text statt white.)

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build`
Expected: ok.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dashboard/AwardBadges.tsx
git commit -m "✨ AwardBadges-Komponente"
```

---

## Task 7: Frontend — Awards einbinden (Hero past + GameDayCard)

**Files:**
- Modify: `frontend/src/components/dashboard/HeroNextGameDay.tsx`
- Modify: `frontend/src/components/dashboard/GameDayCard.tsx`

- [ ] **Step 1: Awards im Hero laden (nur past)**

In `HeroNextGameDay.tsx`:
- `useState<AwardResponse[]>([])` + `useEffect`, der bei `variant === 'past'` `api.getGameDayAwards(gameDay.id)` lädt (catch → `[]`, silent).
- `<AwardBadges awards={awards} />` unter den Spielen rendern (vor/nach „Lineup verwalten"-Button, sinnvoll platziert).

```tsx
import { useEffect, useState } from 'react'
import { AwardBadges } from './AwardBadges'
import type { AwardResponse } from '@/types'
import * as api from '@/api/client'
// ...
const [awards, setAwards] = useState<AwardResponse[]>([])
useEffect(() => {
  if (variant !== 'past') { setAwards([]); return }
  let cancelled = false
  api.getGameDayAwards(gameDay.id)
    .then(a => { if (!cancelled) setAwards(a) })
    .catch(() => { /* silent */ })
  return () => { cancelled = true }
}, [variant, gameDay.id])
```
Render z.B. nach dem Spiele-Block:
```tsx
{variant === 'past' && awards.length > 0 && (
  <div className="mt-2 sm:mt-3">
    <AwardBadges awards={awards} />
  </div>
)}
```

- [ ] **Step 2: Awards auf GameDayCard (fertige Spieltage)**

In `GameDayCard.tsx`: für Spieltage mit abgeschlossenen Spielen (mind. ein `game.endedAt != null`) Awards laden und kompakt anzeigen. Gleiche Lade-/Catch-Logik. Auf hellem Karten-Hintergrund Badge-Farben anpassen (navy-Text). Falls `GameDayCard` keine `endedAt`-Info hat: nur laden, und da `awards.length === 0` bei laufenden/leeren Spieltagen automatisch nichts rendert, ist ein zusätzlicher Guard optional — aber bevorzugt nur laden wenn fertig, um unnötige Calls zu sparen.

- [ ] **Step 3: Build + visuelle Prüfung**

Run: `cd frontend && npm run build`
Dann lokal (`docker compose up -d db`, backend + `npx vite`) Dashboard öffnen, fertigen Spieltag prüfen.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/dashboard/HeroNextGameDay.tsx frontend/src/components/dashboard/GameDayCard.tsx
git commit -m "✨ Awards im Dashboard (Hero past + GameDayCard)"
```

---

# Feature B — Wetter pro Spieltag

## Task 8: Domain — Coordinates, DayForecast, Ports

**Files:**
- Create: `backend/src/main/java/com/softball/domain/model/Coordinates.java`
- Create: `backend/src/main/java/com/softball/domain/model/DayForecast.java`
- Create: `backend/src/main/java/com/softball/domain/port/out/GeocodingPort.java`
- Create: `backend/src/main/java/com/softball/domain/port/out/WeatherForecastPort.java`

- [ ] **Step 1: Records + Ports**

`Coordinates.java`:
```java
package com.softball.domain.model;

public record Coordinates(double latitude, double longitude) {}
```

`DayForecast.java`:
```java
package com.softball.domain.model;

/**
 * Wetter-Zusammenfassung für das Tagesfenster 8–18 Uhr eines Spieltags.
 * tempMin/tempMax in °C (gerundet), wmoCode = WMO-Weather-Code,
 * precipitationProbabilityPct = max. Regenwahrscheinlichkeit im Fenster.
 */
public record DayForecast(
    int tempMin,
    int tempMax,
    int wmoCode,
    int precipitationProbabilityPct
) {}
```

`GeocodingPort.java`:
```java
package com.softball.domain.port.out;

import com.softball.domain.model.Coordinates;

import java.util.Optional;

public interface GeocodingPort {
    Optional<Coordinates> geocode(String location);
}
```

`WeatherForecastPort.java`:
```java
package com.softball.domain.port.out;

import com.softball.domain.model.Coordinates;
import com.softball.domain.model.DayForecast;

import java.time.LocalDate;
import java.util.Optional;

public interface WeatherForecastPort {
    Optional<DayForecast> forecast(Coordinates coords, LocalDate date);
}
```

- [ ] **Step 2: Kompilieren**

Run: `cd backend && ./mvnw -q compile -s .mvn/local-settings.xml`
Expected: BUILD SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/softball/domain/model/Coordinates.java backend/src/main/java/com/softball/domain/model/DayForecast.java backend/src/main/java/com/softball/domain/port/out/GeocodingPort.java backend/src/main/java/com/softball/domain/port/out/WeatherForecastPort.java
git commit -m "✨ Wetter-Domain: Coordinates, DayForecast, Geocoding/Forecast-Ports"
```

---

## Task 9: Adapter out — OpenMeteoGeocodingAdapter (TDD mit MockRestServiceServer)

Open-Meteo Geocoding: `GET https://geocoding-api.open-meteo.com/v1/search?name={q}&count=1&language=de&format=json`
Antwort: `{ "results": [ { "latitude": 50.93, "longitude": 6.95, ... } ] }` — bei keinem Treffer fehlt `results` oder ist leer.

**Files:**
- Test: `backend/src/test/java/com/softball/adapter/out/weather/OpenMeteoGeocodingAdapterTest.java`
- Create: `backend/src/main/java/com/softball/adapter/out/weather/OpenMeteoGeocodingAdapter.java`

- [ ] **Step 1: Failing-Test**

`OpenMeteoGeocodingAdapterTest.java`:
```java
package com.softball.adapter.out.weather;

import com.softball.domain.model.Coordinates;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import org.springframework.http.HttpMethod;

class OpenMeteoGeocodingAdapterTest {

    private RestClient.Builder builder;
    private MockRestServiceServer server;
    private OpenMeteoGeocodingAdapter adapter;

    @BeforeEach
    void setUp() {
        builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        adapter = new OpenMeteoGeocodingAdapter(builder);
    }

    @Test
    void geocode_returnsCoordinates() {
        server.expect(requestTo(org.hamcrest.Matchers.containsString("name=K%C3%B6ln")))
            .andExpect(method(HttpMethod.GET))
            .andRespond(withSuccess(
                "{\"results\":[{\"latitude\":50.93,\"longitude\":6.95}]}",
                MediaType.APPLICATION_JSON));

        Optional<Coordinates> result = adapter.geocode("Köln");

        assertThat(result).isPresent();
        assertThat(result.get().latitude()).isEqualTo(50.93);
        assertThat(result.get().longitude()).isEqualTo(6.95);
    }

    @Test
    void geocode_noResults_empty() {
        server.expect(requestTo(org.hamcrest.Matchers.containsString("name=")))
            .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        assertThat(adapter.geocode("xyzkeintreffer")).isEmpty();
    }

    @Test
    void geocode_blankInput_empty() {
        assertThat(adapter.geocode("  ")).isEmpty();
        assertThat(adapter.geocode(null)).isEmpty();
    }
}
```
Hinweis: `requestTo(containsString(...))` braucht den statischen Import `requestTo` (überladen mit `Matcher<String>`). Falls Signatur klemmt, `MockRestRequestMatchers.requestToUriTemplate` oder eine eigene `requestTo(Matcher)`-Variante nutzen.

- [ ] **Step 2: Test laufen → FAIL (Adapter fehlt)**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=OpenMeteoGeocodingAdapterTest`
Expected: Compile-Fehler / FAIL.

- [ ] **Step 3: Adapter implementieren**

`OpenMeteoGeocodingAdapter.java`:
```java
package com.softball.adapter.out.weather;

import com.softball.domain.model.Coordinates;
import com.softball.domain.port.out.GeocodingPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "feature.weather.enabled", havingValue = "true", matchIfMissing = true)
public class OpenMeteoGeocodingAdapter implements GeocodingPort {

    private static final Logger log = LoggerFactory.getLogger(OpenMeteoGeocodingAdapter.class);
    private static final String BASE = "https://geocoding-api.open-meteo.com/v1/search";

    private final RestClient client;

    public OpenMeteoGeocodingAdapter(final RestClient.Builder builder) {
        this.client = builder.build();
    }

    @Override
    public Optional<Coordinates> geocode(final String location) {
        if (location == null || location.isBlank()) {
            return Optional.empty();
        }
        try {
            final String uri = UriComponentsBuilder.fromHttpUrl(BASE)
                .queryParam("name", location.trim())
                .queryParam("count", 1)
                .queryParam("language", "de")
                .queryParam("format", "json")
                .build().toUriString();

            final GeoResponse body = client.get().uri(uri).retrieve().body(GeoResponse.class);
            if (body == null || body.results() == null || body.results().isEmpty()) {
                return Optional.empty();
            }
            final GeoResult r = body.results().get(0);
            return Optional.of(new Coordinates(r.latitude(), r.longitude()));
        } catch (final Exception e) {
            log.warn("Geocoding für '{}' fehlgeschlagen: {}", location, e.getMessage());
            return Optional.empty();
        }
    }

    record GeoResponse(List<GeoResult> results) {}
    record GeoResult(double latitude, double longitude) {}
}
```
Hinweis: Jackson ignoriert unbekannte Felder standardmäßig (Spring Boot default `FAIL_ON_UNKNOWN_PROPERTIES=false`).

- [ ] **Step 4: Test laufen → grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=OpenMeteoGeocodingAdapterTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/weather/OpenMeteoGeocodingAdapter.java backend/src/test/java/com/softball/adapter/out/weather/OpenMeteoGeocodingAdapterTest.java
git commit -m "✨ OpenMeteoGeocodingAdapter (location → Koordinaten)"
```

---

## Task 10: Adapter out — OpenMeteoWeatherAdapter (TDD)

Forecast: `GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,precipitation_probability,weather_code&start_date={d}&end_date={d}&timezone=Europe%2FBerlin`
Antwort (gekürzt):
```json
{"hourly":{"time":["2026-06-05T07:00","2026-06-05T08:00","2026-06-05T13:00","2026-06-05T18:00","2026-06-05T19:00"],
"temperature_2m":[10.0,12.0,21.0,17.0,30.0],
"precipitation_probability":[5,10,40,20,99],
"weather_code":[1,2,61,3,95]}}
```
Logik: nur Stunden mit lokaler Stunde **8–18 inkl.** berücksichtigen (Index per `time`-String, Stunde aus `Txx:`). `tempMin/Max` = gerundetes min/max der Temperaturen im Fenster. `precipitationProbabilityPct` = max im Fenster. `wmoCode` = weather_code zur Stunde 13:00 falls vorhanden, sonst erster Eintrag im Fenster. Leeres Fenster → `Optional.empty()`.

**Files:**
- Test: `backend/src/test/java/com/softball/adapter/out/weather/OpenMeteoWeatherAdapterTest.java`
- Create: `backend/src/main/java/com/softball/adapter/out/weather/OpenMeteoWeatherAdapter.java`

- [ ] **Step 1: Failing-Test**

`OpenMeteoWeatherAdapterTest.java`:
```java
package com.softball.adapter.out.weather;

import com.softball.domain.model.Coordinates;
import com.softball.domain.model.DayForecast;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class OpenMeteoWeatherAdapterTest {

    private RestClient.Builder builder;
    private MockRestServiceServer server;
    private OpenMeteoWeatherAdapter adapter;

    @BeforeEach
    void setUp() {
        builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        adapter = new OpenMeteoWeatherAdapter(builder);
    }

    @Test
    void forecast_windowEightToEighteen_minMaxAndRain() {
        String json = "{\"hourly\":{"
            + "\"time\":[\"2026-06-05T07:00\",\"2026-06-05T08:00\",\"2026-06-05T13:00\",\"2026-06-05T18:00\",\"2026-06-05T19:00\"],"
            + "\"temperature_2m\":[10.0,12.0,21.4,17.0,30.0],"
            + "\"precipitation_probability\":[5,10,40,20,99],"
            + "\"weather_code\":[1,2,61,3,95]}}";
        server.expect(requestTo(containsString("latitude=50.93")))
            .andExpect(method(HttpMethod.GET))
            .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        Optional<DayForecast> f = adapter.forecast(new Coordinates(50.93, 6.95), LocalDate.of(2026, 6, 5));

        assertThat(f).isPresent();
        // Fenster = 08,13,18 Uhr → temps 12.0, 21.4, 17.0
        assertThat(f.get().tempMin()).isEqualTo(12);
        assertThat(f.get().tempMax()).isEqualTo(21);
        assertThat(f.get().precipitationProbabilityPct()).isEqualTo(40);
        assertThat(f.get().wmoCode()).isEqualTo(61); // 13:00-Code
    }

    @Test
    void forecast_emptyWindow_empty() {
        String json = "{\"hourly\":{\"time\":[\"2026-06-05T05:00\"],"
            + "\"temperature_2m\":[8.0],\"precipitation_probability\":[0],\"weather_code\":[0]}}";
        server.expect(requestTo(containsString("latitude=")))
            .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));
        assertThat(adapter.forecast(new Coordinates(1, 2), LocalDate.of(2026, 6, 5))).isEmpty();
    }
}
```

- [ ] **Step 2: Test laufen → FAIL**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=OpenMeteoWeatherAdapterTest`
Expected: FAIL (Adapter fehlt).

- [ ] **Step 3: Adapter implementieren**

`OpenMeteoWeatherAdapter.java`:
```java
package com.softball.adapter.out.weather;

import com.softball.domain.model.Coordinates;
import com.softball.domain.model.DayForecast;
import com.softball.domain.port.out.WeatherForecastPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "feature.weather.enabled", havingValue = "true", matchIfMissing = true)
public class OpenMeteoWeatherAdapter implements WeatherForecastPort {

    private static final Logger log = LoggerFactory.getLogger(OpenMeteoWeatherAdapter.class);
    private static final String BASE = "https://api.open-meteo.com/v1/forecast";
    private static final int WINDOW_START = 8;
    private static final int WINDOW_END = 18;   // inklusive
    private static final int PREFERRED_HOUR = 13;

    private final RestClient client;

    public OpenMeteoWeatherAdapter(final RestClient.Builder builder) {
        this.client = builder.build();
    }

    @Override
    public Optional<DayForecast> forecast(final Coordinates coords, final LocalDate date) {
        if (coords == null || date == null) {
            return Optional.empty();
        }
        try {
            final String uri = UriComponentsBuilder.fromHttpUrl(BASE)
                .queryParam("latitude", coords.latitude())
                .queryParam("longitude", coords.longitude())
                .queryParam("hourly", "temperature_2m,precipitation_probability,weather_code")
                .queryParam("start_date", date.toString())
                .queryParam("end_date", date.toString())
                .queryParam("timezone", "Europe/Berlin")
                .build().toUriString();

            final ForecastResponse body = client.get().uri(uri).retrieve().body(ForecastResponse.class);
            if (body == null || body.hourly() == null || body.hourly().time() == null) {
                return Optional.empty();
            }
            return summarize(body.hourly());
        } catch (final Exception e) {
            log.warn("Forecast {} @ {},{} fehlgeschlagen: {}",
                date, coords.latitude(), coords.longitude(), e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<DayForecast> summarize(final Hourly h) {
        final List<String> times = h.time();
        Double min = null, max = null;
        int maxPrecip = 0;
        Integer preferredCode = null, firstCode = null;

        for (int i = 0; i < times.size(); i++) {
            final int hour = parseHour(times.get(i));
            if (hour < WINDOW_START || hour > WINDOW_END) {
                continue;
            }
            final double t = h.temperature_2m().get(i);
            min = (min == null) ? t : Math.min(min, t);
            max = (max == null) ? t : Math.max(max, t);
            if (h.precipitation_probability() != null) {
                final Integer p = h.precipitation_probability().get(i);
                if (p != null) maxPrecip = Math.max(maxPrecip, p);
            }
            final int code = h.weather_code().get(i);
            if (firstCode == null) firstCode = code;
            if (hour == PREFERRED_HOUR) preferredCode = code;
        }
        if (min == null) {
            return Optional.empty();
        }
        final int wmo = (preferredCode != null) ? preferredCode : firstCode;
        return Optional.of(new DayForecast(
            (int) Math.round(min), (int) Math.round(max), wmo, maxPrecip));
    }

    /** "2026-06-05T13:00" → 13 */
    private int parseHour(final String iso) {
        final int t = iso.indexOf('T');
        return Integer.parseInt(iso.substring(t + 1, t + 3));
    }

    record ForecastResponse(Hourly hourly) {}
    record Hourly(
        List<String> time,
        List<Double> temperature_2m,
        List<Integer> precipitation_probability,
        List<Integer> weather_code
    ) {}
}
```

- [ ] **Step 4: Test laufen → grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=OpenMeteoWeatherAdapterTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/out/weather/OpenMeteoWeatherAdapter.java backend/src/test/java/com/softball/adapter/out/weather/OpenMeteoWeatherAdapterTest.java
git commit -m "✨ OpenMeteoWeatherAdapter (Tagesfenster 8–18 Uhr Forecast)"
```

---

## Task 11: Application — WeatherService (Cache + Range-Guard, TDD)

**Logik:**
- `getForecast(GameDay gd)` bzw. `getForecast(String location, LocalDate date)`:
  - Guard: `date` vor heute → empty. `date` > heute + 16 Tage → empty.
  - Geocode (gecached dauerhaft je location-String) → Forecast (gecached TTL 2h je `lat,lon,date`).
- Caches: `ConcurrentHashMap`. Geocode-Cache: `Map<String, Optional<Coordinates>>`. Forecast-Cache: `Map<String, CacheEntry>` mit Key `lat,lon,date` + Timestamp.
- `Clock` injizierbar für Testbarkeit (default `Clock.systemDefaultZone()`).

**Files:**
- Test: `backend/src/test/java/com/softball/application/WeatherServiceTest.java`
- Create: `backend/src/main/java/com/softball/application/WeatherService.java`

- [ ] **Step 1: Failing-Test**

`WeatherServiceTest.java`:
```java
package com.softball.application;

import com.softball.domain.model.Coordinates;
import com.softball.domain.model.DayForecast;
import com.softball.domain.port.out.GeocodingPort;
import com.softball.domain.port.out.WeatherForecastPort;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class WeatherServiceTest {

    private final Clock clock = Clock.fixed(
        LocalDate.of(2026, 6, 1).atStartOfDay(ZoneId.of("Europe/Berlin")).toInstant(),
        ZoneId.of("Europe/Berlin"));

    @Test
    void returnsForecast_andCachesGeocode() {
        GeocodingPort geo = mock(GeocodingPort.class);
        WeatherForecastPort wx = mock(WeatherForecastPort.class);
        Coordinates c = new Coordinates(50.93, 6.95);
        DayForecast f = new DayForecast(12, 21, 61, 40);
        when(geo.geocode("Köln")).thenReturn(Optional.of(c));
        when(wx.forecast(c, LocalDate.of(2026, 6, 5))).thenReturn(Optional.of(f));

        WeatherService service = new WeatherService(geo, wx, clock);

        assertThat(service.getForecast("Köln", LocalDate.of(2026, 6, 5))).contains(f);
        // zweiter Aufruf → Geocode-Cache greift (nur 1×)
        service.getForecast("Köln", LocalDate.of(2026, 6, 5));
        verify(geo, times(1)).geocode("Köln");
    }

    @Test
    void pastDate_emptyNoCalls() {
        GeocodingPort geo = mock(GeocodingPort.class);
        WeatherForecastPort wx = mock(WeatherForecastPort.class);
        WeatherService service = new WeatherService(geo, wx, clock);

        assertThat(service.getForecast("Köln", LocalDate.of(2026, 5, 31))).isEmpty();
        verifyNoInteractions(geo, wx);
    }

    @Test
    void beyondHorizon_emptyNoCalls() {
        GeocodingPort geo = mock(GeocodingPort.class);
        WeatherForecastPort wx = mock(WeatherForecastPort.class);
        WeatherService service = new WeatherService(geo, wx, clock);

        assertThat(service.getForecast("Köln", LocalDate.of(2026, 6, 30))).isEmpty();
        verifyNoInteractions(geo, wx);
    }

    @Test
    void geocodeFails_empty() {
        GeocodingPort geo = mock(GeocodingPort.class);
        WeatherForecastPort wx = mock(WeatherForecastPort.class);
        when(geo.geocode(anyString())).thenReturn(Optional.empty());
        WeatherService service = new WeatherService(geo, wx, clock);

        assertThat(service.getForecast("Nirgendwo", LocalDate.of(2026, 6, 5))).isEmpty();
        verifyNoInteractions(wx);
    }
}
```

- [ ] **Step 2: Test laufen → FAIL**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=WeatherServiceTest`
Expected: FAIL.

- [ ] **Step 3: Service implementieren**

`WeatherService.java`:
```java
package com.softball.application;

import com.softball.domain.model.Coordinates;
import com.softball.domain.model.DayForecast;
import com.softball.domain.port.out.GeocodingPort;
import com.softball.domain.port.out.WeatherForecastPort;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class WeatherService {

    private static final int HORIZON_DAYS = 16;
    private static final Duration FORECAST_TTL = Duration.ofHours(2);

    private final GeocodingPort geocoding;
    private final WeatherForecastPort forecast;
    private final Clock clock;

    private final ConcurrentHashMap<String, Optional<Coordinates>> geoCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CacheEntry> forecastCache = new ConcurrentHashMap<>();

    public WeatherService(final GeocodingPort geocoding,
                          final WeatherForecastPort forecast,
                          final Clock clock) {
        this.geocoding = geocoding;
        this.forecast = forecast;
        this.clock = clock;
    }

    public Optional<DayForecast> getForecast(final String location, final LocalDate date) {
        if (location == null || location.isBlank() || date == null) {
            return Optional.empty();
        }
        final LocalDate today = LocalDate.now(clock);
        if (date.isBefore(today) || date.isAfter(today.plusDays(HORIZON_DAYS))) {
            return Optional.empty();
        }
        final Optional<Coordinates> coords =
            geoCache.computeIfAbsent(location.trim(), geocoding::geocode);
        if (coords.isEmpty()) {
            return Optional.empty();
        }
        return cachedForecast(coords.get(), date);
    }

    private Optional<DayForecast> cachedForecast(final Coordinates c, final LocalDate date) {
        final String key = c.latitude() + "," + c.longitude() + "," + date;
        final Instant now = clock.instant();
        final CacheEntry hit = forecastCache.get(key);
        if (hit != null && now.isBefore(hit.expiresAt())) {
            return hit.value();
        }
        final Optional<DayForecast> fresh = forecast.forecast(c, date);
        forecastCache.put(key, new CacheEntry(fresh, now.plus(FORECAST_TTL)));
        return fresh;
    }

    private record CacheEntry(Optional<DayForecast> value, Instant expiresAt) {}
}
```

- [ ] **Step 4: Clock-Bean bereitstellen (falls noch keine existiert)**

Prüfen ob bereits eine `Clock`-Bean im Context ist: `grep -rn "Clock" backend/src/main/java/com/softball/shared/config`. Falls nicht, in einer Config-Klasse (z.B. neue `shared/config/TimeConfig.java`) ergänzen:
```java
package com.softball.shared.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.time.Clock;

@Configuration
public class TimeConfig {
    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
```
Falls schon eine `Clock`-Bean existiert: diesen Step überspringen.

- [ ] **Step 5: Test laufen → grün**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=WeatherServiceTest`
Expected: PASS (4 Tests).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/softball/application/WeatherService.java backend/src/test/java/com/softball/application/WeatherServiceTest.java backend/src/main/java/com/softball/shared/config/TimeConfig.java
git commit -m "✨ WeatherService: Geocode+Forecast mit Cache & Range-Guard"
```

---

## Task 12: Adapter in + Config — WeatherResponse, WeatherController, Feature-Flag

**Files:**
- Create: `backend/src/main/java/com/softball/adapter/dto/WeatherResponse.java`
- Create: `backend/src/main/java/com/softball/adapter/in/web/WeatherController.java`
- Modify: `backend/src/main/resources/application.properties`

- [ ] **Step 1: DTO**

`WeatherResponse.java`:
```java
package com.softball.adapter.dto;

import com.softball.domain.model.DayForecast;

public record WeatherResponse(
    int tempMin,
    int tempMax,
    int wmoCode,
    int precipitationProbabilityPct
) {
    public static WeatherResponse from(final DayForecast f) {
        return new WeatherResponse(f.tempMin(), f.tempMax(), f.wmoCode(), f.precipitationProbabilityPct());
    }
}
```

- [ ] **Step 2: Controller**

Lädt GameDay (für location + date) über bestehende `GameDayService`. Prüfen wie GameDay geladen wird: `grep -n "public" backend/src/main/java/com/softball/application/GameDayService.java | grep -i "get\|find"`. Methode für „GameDay by id“ verwenden (liefert Domain `GameDay` oder DTO mit `location`/`date`). Beispiel mit Domain-`GameDay`:

`WeatherController.java`:
```java
package com.softball.adapter.in.web;

import com.softball.adapter.dto.WeatherResponse;
import com.softball.application.GameDayService;
import com.softball.application.WeatherService;
import com.softball.domain.model.GameDay;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WeatherController {

    private final WeatherService weatherService;
    private final GameDayService gameDayService;

    public WeatherController(final WeatherService weatherService, final GameDayService gameDayService) {
        this.weatherService = weatherService;
        this.gameDayService = gameDayService;
    }

    @GetMapping("/api/gamedays/{gameDayId}/weather")
    public ResponseEntity<WeatherResponse> getWeather(@PathVariable final Long gameDayId) {
        final GameDay gd = gameDayService.getGameDay(gameDayId); // an tatsächliche Methode anpassen
        return weatherService.getForecast(gd.getLocation(), gd.getDate())
            .map(WeatherResponse::from)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.noContent().build()); // HTTP 204
    }
}
```
Methodennamen (`getGameDay`) an die reale `GameDayService`-API anpassen. Falls der Service nur ein DTO liefert, dessen `location`/`date`-Getter nutzen.

- [ ] **Step 3: Feature-Flag**

In `backend/src/main/resources/application.properties` ergänzen (bei den anderen `feature.*`-Einträgen):
```properties
feature.weather.enabled=${WEATHER_ENABLED:true}
```
Hinweis: Adapter sind `@ConditionalOnProperty(..., matchIfMissing = true)`. Wenn `feature.weather.enabled=false`, fehlen die Port-Beans → `WeatherService` (verlangt sie im Konstruktor) würde den Context-Start brechen. Lösung: `WeatherService` und `WeatherController` ebenfalls mit `@ConditionalOnProperty(name="feature.weather.enabled", havingValue="true", matchIfMissing=true)` annotieren, damit das gesamte Wetter-Feature gemeinsam an/aus geht.

`WeatherService` und `WeatherController` entsprechend annotieren (Import `org.springframework.boot.autoconfigure.condition.ConditionalOnProperty`).

- [ ] **Step 4: Voller Backend-Test-Lauf**

Run: `docker compose up -d db && cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: PASS, kein Context-Start-Fehler.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/dto/WeatherResponse.java backend/src/main/java/com/softball/adapter/in/web/WeatherController.java backend/src/main/java/com/softball/application/WeatherService.java backend/src/main/resources/application.properties
git commit -m "✨ GET /api/gamedays/{id}/weather + feature.weather.enabled Flag"
```

---

## Task 13: Frontend — WeatherPill (frontend-design) + Typ + Client

**REQUIRED SUB-SKILL bei diesem Task:** `frontend-design` — die Pill muss sich nahtlos in den dunklen `HeroNextGameDay`-Header einfügen (white/65-Töne wie die `MapPin`-Location-Zeile, font-display). Vor dem Schreiben `frontend-design` invoken.

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api/client.ts`
- Create: `frontend/src/components/dashboard/WeatherPill.tsx`

- [ ] **Step 1: Typ**

In `frontend/src/types.ts`:
```ts
export interface WeatherResponse {
  tempMin: number
  tempMax: number
  wmoCode: number
  precipitationProbabilityPct: number
}
```

- [ ] **Step 2: Client (204 → null)**

Die `request<T>`-Wrapper-Funktion wirft evtl. bei leerem Body. Daher eigener Fetch mit 204-Handling. In `client.ts`:
```ts
export const getGameDayWeather = async (id: number): Promise<WeatherResponse | null> => {
  try {
    return await request<WeatherResponse>(`/gamedays/${id}/weather`)
  } catch {
    return null
  }
}
```
Prüfen wie `request<T>` mit 204 umgeht (`frontend/src/api/client.ts:22`). Falls `request` bei 204 bereits `null`/Fehler liefert: obiges try/catch fängt es ab. Falls `request` JSON-Parse bei leerem Body wirft → ebenfalls abgefangen. Import `WeatherResponse` ergänzen.

- [ ] **Step 3: WeatherPill-Komponente**

Anforderungen:
- Props: `weather: WeatherResponse | null`. Bei `null` → `return null`.
- WMO→lucide-Icon-Mapping:
  - 0 → `Sun`
  - 1–3 → `CloudSun` (oder `Cloud`)
  - 45,48 → `CloudFog`
  - 51–67, 80–82 → `CloudRain`
  - 71–77, 85,86 → `CloudSnow`
  - 95–99 → `CloudLightning`
  - sonst → `Cloud`
- Anzeige: Icon + `{tempMin}–{tempMax}°` + bei `precipitationProbabilityPct >= 20` zusätzlich `CloudRain`-Icon + `{pct}%`.
- Stil: passend zum dunklen Hero-Header (`text-white/65`, `text-[10px] sm:text-xs`, inline-flex gap).

```tsx
import { Sun, CloudSun, CloudFog, CloudRain, CloudSnow, CloudLightning, Cloud } from 'lucide-react'
import type { WeatherResponse } from '@/types'

function iconFor(code: number) {
  if (code === 0) return Sun
  if (code <= 3) return CloudSun
  if (code === 45 || code === 48) return CloudFog
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return CloudSnow
  if (code >= 95) return CloudLightning
  return Cloud
}

interface Props { weather: WeatherResponse | null }

export function WeatherPill({ weather }: Props) {
  if (!weather) return null
  const Icon = iconFor(weather.wmoCode)
  const showRain = weather.precipitationProbabilityPct >= 20
  return (
    <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs text-white/65">
      <Icon size={13} className="shrink-0" />
      <span className="font-display font-bold">{weather.tempMin}–{weather.tempMax}°</span>
      {showRain && (
        <span className="inline-flex items-center gap-0.5">
          <CloudRain size={11} className="shrink-0" /> {weather.precipitationProbabilityPct}%
        </span>
      )}
    </div>
  )
}
```
(frontend-design verfeinert Platzierung/Akzent.)

- [ ] **Step 4: Build**

Run: `cd frontend && npm run build`
Expected: ok.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types.ts frontend/src/api/client.ts frontend/src/components/dashboard/WeatherPill.tsx
git commit -m "✨ Frontend: WeatherResponse Typ + getGameDayWeather + WeatherPill"
```

---

## Task 14: Frontend — WeatherPill in Hero einbinden

**Files:**
- Modify: `frontend/src/components/dashboard/HeroNextGameDay.tsx`

- [ ] **Step 1: Wetter laden (nur today/upcoming, ≤14 Tage)**

In `HeroNextGameDay.tsx`:
```tsx
import { WeatherPill } from './WeatherPill'
import type { WeatherResponse } from '@/types'
// ...
const [weather, setWeather] = useState<WeatherResponse | null>(null)
useEffect(() => {
  if (variant === 'past') { setWeather(null); return }
  const daysAhead = Math.floor(
    (new Date(gameDay.date + 'T00:00:00').getTime() - Date.now()) / 86_400_000)
  if (daysAhead < 0 || daysAhead > 14) { setWeather(null); return }
  let cancelled = false
  api.getGameDayWeather(gameDay.id)
    .then(w => { if (!cancelled) setWeather(w) })
    .catch(() => { /* silent */ })
  return () => { cancelled = true }
}, [variant, gameDay.id, gameDay.date])
```

- [ ] **Step 2: Pill rendern**

Neben der Location-Zeile im Header-Block (rechts neben `MapPin`-Location oder darunter). Beispiel: in den `flex items-baseline justify-between`-Block die rechte Spalte erweitern:
```tsx
<div className="flex flex-col items-end gap-0.5">
  {gameDay.location && (
    <div className="text-[10px] sm:text-xs text-white/65 truncate inline-flex items-center gap-1">
      <MapPin size={11} className="shrink-0" /> {gameDay.location}
    </div>
  )}
  <WeatherPill weather={weather} />
</div>
```
Bestehende Location-`div`-Struktur entsprechend ersetzen.

- [ ] **Step 3: Build + lokal prüfen**

Run: `cd frontend && npm run build`
Dann lokal Dashboard öffnen, kommenden Spieltag (≤14 Tage, mit auflösbarer location) prüfen → Pill erscheint; weit entfernter/vergangener Spieltag → keine Pill.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/dashboard/HeroNextGameDay.tsx
git commit -m "✨ Wetter-Pill im Dashboard-Hero (nächster Spieltag)"
```

---

## Final Verification

- [ ] **Backend voll:** `docker compose up -d db && cd backend && ./mvnw test -s .mvn/local-settings.xml` → PASS
- [ ] **Frontend:** `cd frontend && npm run build` → PASS, `npm run lint` → clean
- [ ] **Manuell:** Dashboard — fertiger Spieltag zeigt Awards, kommender Spieltag (≤14d) zeigt Wetter-Pill, `feature.weather.enabled=false` → keine Pill, kein Fehler.

---

## Self-Review (vom Plan-Autor)

**Spec-Coverage:**
- Wetter Open-Meteo + Auto-Geocode → Tasks 8–10. ✓
- Kompakt-Pill Min–Max + Icon + Regen% → Tasks 13–14. ✓
- Range-Guard (≤14d Frontend, ≤16d/Vergangenheit Backend) → Task 11 + 14. ✓
- Feature-Flag → Task 12. ✓
- Awards: MVP-Composite + Power/Speed/On-Base, Schwellen, Dedup → Task 2. ✓
- lucide-Icons (Trophy/Flame/Wind/Target; Sun/Cloud…) → Tasks 6, 13. ✓
- Anzeige nur fertige Spieltage (Awards) / nur today+upcoming (Wetter) → Tasks 7, 14. ✓
- Edge-Cases (leer → nichts rendern, API down → still) → Adapter try/catch + 204 + Frontend catch. ✓

**Placeholder-Scan:** Konkreter Code in jedem Code-Step. Zwei bewusste Anpass-Stellen an reale APIs: `BattingStatsService`-Aggregations-Aufruf (Task 3) und `GameDayService.getGameDay` (Task 12) — beide explizit als „an bestehende Methode anpassen" markiert, da exakte Signatur erst beim Umsetzen sichtbar.

**Typ-Konsistenz:** `BattingStats`-Felder gegen reales Record geprüft (totalBases, runsBattedIn, walks, stolenBases, onBasePct, ops(), doubles/triples/homeRuns, plateAppearances, playerId/playerName). `DayForecast`/`Coordinates`/`Award` durchgängig gleich benannt in Domain→DTO→Frontend.

**Scope:** Zwei unabhängige Features in einem Plan, aber klar getrennt (Feature A Tasks 1–7, Feature B 8–14). Jedes für sich lauffähig/testbar. Akzeptabel.
