# Spielbogen Edge Cases — Design

**Datum:** 2026-05-01
**Status:** Approved (mündlich)
**Vorgänger:** [2026-04-30-spielbogen-design.md](2026-04-30-spielbogen-design.md)

## Hintergrund

Phase 1–3 des Spielbogen ist live. Audit gegen drei reale RFL-Sheets (Krefeld vs Cologne, Cologne vs Wuppertal, Wuppertal vs Krefeld) zeigt fehlende Notations-Typen die Trainer regelmäßig brauchen. User hat per Caveman-Approval die folgende Scope freigegeben.

## In-Scope

### P1.1 — Pitcher-/Catcher-Mistakes (WP / PB)

Wild Pitch (Pitcher wirft daneben, Runner advance) und Passed Ball (Catcher fängt nicht, Runner advance) sind kein Stealing. Aktuell nur via STOLEN_BASE encodierbar — falsche Stat-Attribution.

**Backend:**
- Neue Tabelle `spielbogen_pitching_event` ODER neuer `StealingEventType`-Wert. Empfehlung: erweitern statt neue Tabelle, weil Datenfluss identisch (Runner advance / out, an einem Cell festgemacht).
- `StealingEventType` erweitern: `WILD_PITCH | PASSED_BALL` neben bestehenden `STOLEN_BASE | CAUGHT_STEALING | OUT_ON_PLAY`.
- Reusing `SpielbogenStealingEvent` Tabelle: `slotId` = Runner der profitiert hat, `fromBase`/`toBase` = wohin, `type` = Mistake-Typ.

**Frontend:**
- Im Live-Scoring-View neuer Action-Button "WP/PB" (small, neben "SB"). Drawer zeigt Runner-Liste, je Runner Cycle-Picker (bleibt → +1 → +2 → Home), wie Tag-Up.
- Cell-Notation: kleine Marker am Cell des begünstigten Runners — z.B. "WP" oder "PB" Mini-Label oben über Diamond. Stealing-Arrow als gestrichelte Linie weiter zwischen den Bases (anders Farbe als Steal: WP/PB = orange, Steal = rot).
- PDF: gleiche Notation.

**Stats-Konsequenz:** WP/PB zählen NICHT als SB für Runner-Stats. Ggf. Pitcher/Catcher-Tracking später (out of scope für jetzt).

### P1.2 — Fielder's Choice (FC) als eigene OutType

Aktuell: FC encodiert als `OUT` mit `outType=FORCE_OUT` oder `TAG_OUT` mit chain. Cell-Label = nur Chain ("5-3"), kein "FC" sichtbar. Real-Sheets schreiben aber **explizit "FC"**.

**Backend:**
- `OutType` erweitern: `FIELDERS_CHOICE` neben `FORCE_OUT`, `TAG_OUT` etc.
- Bedeutung: Batter ist safe an 1B, Runner wird stattdessen out.
- AB hat: result=OUT, outType=FIELDERS_CHOICE, fielderChain=[def-positions], baseStateAfter mit Batter auf 1B.

**Frontend:**
- OutDetailDrawer: "Runner out — Batter safe an 1B" Option setzt outType=FIELDERS_CHOICE.
- Cell-Label = "FC" + Chain (z.B. "FC 5-4") oder kompakter "5-4 FC".
- Batter-Reach=1 (auf 1B), aber gilt als OUT für Out-Counter (out-index zeigt I/II/III).
- Renderer: `reachedBaseForAtBat` muss FC korrekt erkennen (Batter auf 1B trotz OUT). Aktueller Code prüft baseStateAfter.firstSlotId ✓.

**Stats:** FC zählt als At-Bat (zählt für AVG-Denominator), aber nicht als Hit. Bereits korrekt wenn AB.result=OUT.

### P1.3 — Multi-Base-Advance bei allen Out-Typen

Real-Sheets zeigen Runner advance auf Errors / Overthrows auch bei Grounder-Outs / FC / Force-Out, nicht nur Tag-Up. Bsp: Spieler 4 schlägt Grounder zu SS, SS wirft daneben (E5 oder E3), Runner von 1B kommt nach Home, Batter zu 3B.

**Backend:** Kein Datenmodell-Change nötig — `baseStateAfter` ist schon flexibel.

**Frontend:**
- Refactor `RunnerAdvancePickerView` raus aus FlyOut-spezifischem Pfad. Wird für alle Out-Typen mit Runners-on-Base auswählbar.
- OutDetailDrawer-Flow: nach Out-Detail-Submit, falls Runner auf Bases UND User wählt "Mit Error / Overthrow" → Picker. Default: Force-Outs werfen Runner force-mäßig +1 (current Verhalten); Optional-Button "Korrektur Runner" öffnet Picker.
- Alternative simpler: NACH jedem AB der Out ist, IMMER Picker zeigen wenn Runner auf Base ist UND User explizit "Runner-Advance anpassen" tappt. Default = bestehende Logik (Force-Out etc.).

**UX-Wahl:** Default-Advance-Logik bleibt automatisch (z.B. Force bei Bases-Loaded), Picker nur bei explizitem Tap einer "Runner-Advance editieren"-Option im Drawer. Verhindert Tap-Hölle bei Standard-Plays.

### P2.5 — 3-Outs-Auto-Switch inkl. Pickoff/CS

Aktuell: User wechselt Side manuell via Toggle. Wenn Inning-Outs (AB-Outs + Stealing-Outs `OUT_ON_PLAY` + Caught-Stealing) = 3 → Auto-Side-Switch + Inning++.

**Backend:**
- `SpielbogenScoringService`: nach jedem `recordAtBat` und `recordStealingEvent` prüfen ob 3 Outs erreicht. Wenn ja: switchSide + (falls Bottom war) Inning++.
- Out-Counter für aktuelles Inning: zählt AB-Outs (STRIKEOUT, OUT mit allen outTypes) + Stealing-Events mit type CAUGHT_STEALING / OUT_ON_PLAY.
- Edge: Auto-Switch sollte bei letztem Inning-Bottom + Heim führt → game-end statt switch (Walk-off). Aber Game-End-Logik bleibt manuell wie bisher.

**Frontend:**
- Toast nach Auto-Switch: "Inning N+1 — Gast/Heim am Schlag".
- Side-Toggle bleibt manuell überschreibbar (für Korrektur-Fälle).

### P2.6 — Sacrifice-Flags (SAC / SF)

Sac Bunt: Bunt, Batter out an 1B, Runner advance. Sac Fly: Fly Out, Runner von 3B (oder weiter mit Tag-Up) scort. Wichtig für AVG-Korrektur (zählt nicht als At-Bat).

**Backend:**
- AB neue Felder: `isSacrificeBunt: boolean`, `isSacrificeFly: boolean`. ODER kompakter: `sacrificeType: 'BUNT' | 'FLY' | null`.
- Empfehlung: enum `sacrificeType` weil Mutex.

**Frontend:**
- OutDetailDrawer: bei Bunt-Out (Grounder + chain mit C/P involved) → optional Toggle "Sacrifice Bunt".
- Bei Fly Out + RBI → optional Toggle "Sacrifice Fly".
- Cell-Label-Suffix: "SH" für Sac Bunt, "SF" für Sac Fly (z.B. "F8 SF").

**Stats-Konsequenz:** Späterer Stats-Service muss `sacrificeType` ausschließen vom AB-Counter, behalten in PA.

## Out-of-Scope (mit Begründung)

- **Intentional Walk** — User: "gibt's bei uns nicht".
- **Catcher's Interference (CI)** — User: "selten, encodiert als BB workaround". Akzeptabel; kein eigener Eintrag.
- **Infield Fly Rule (IFR)** — User: "gibt's auch". Aktuell als regulärer Fly Out encodierbar; kein eigener Flag. Kann später als boolean `isInfieldFly` ergänzt werden falls Stat-Bedarf.
- **Batter Interference** — User: "gibt's auch". Kann als OUT mit free-form Chain encodiert werden. Eigener OutType nicht zwingend.
- **Dropped Third Strike (D3K)** — User skipped (kennt's nicht / kommt selten vor).
- **Game-End-Reason "TIME"** — User: "muss man nicht schreiben".
- **Earned-Run-Tracking** — kein Pitcher-Stat-Bedarf jetzt.
- **Courtesy Runner** — Fastpitch-Spezial, RFL-Bedarf unklar; bei Bedarf später.
- **Appeal Plays** (Tag-Up zu früh, Missed Base) — extrem selten in Liga-Praxis.
- **Out-Subtypen Line/Pop** — Chain-Notation reicht.

## Datenmodell-Änderungen (Backend)

### Migrations

```sql
-- V{n}__spielbogen_edge_cases.sql
ALTER TYPE stealing_event_type_enum
  ADD VALUE 'WILD_PITCH';
ALTER TYPE stealing_event_type_enum
  ADD VALUE 'PASSED_BALL';

ALTER TYPE out_type_enum
  ADD VALUE 'FIELDERS_CHOICE';

ALTER TABLE spielbogen_at_bat
  ADD COLUMN sacrifice_type VARCHAR(8) NULL CHECK (sacrifice_type IN ('BUNT','FLY'));
```

### Java-Enums

```java
// StealingEventType
WILD_PITCH, PASSED_BALL  // neu

// OutType
FIELDERS_CHOICE  // neu

// SpielbogenAtBat (Entity + Domain Model + DTOs)
sacrificeType: SacrificeType (enum BUNT, FLY) | null
```

### DTO

```typescript
// SpielbogenAtBatResponse + Request
sacrificeType?: 'BUNT' | 'FLY' | null

// SpielbogenStealingResponse — Type-Union erweitert
type: 'STOLEN_BASE' | 'CAUGHT_STEALING' | 'OUT_ON_PLAY' | 'WILD_PITCH' | 'PASSED_BALL'
```

## Frontend-Komponenten

### Renderer (`bogenSheetRenderer.ts`)

- `reachedBaseForAtBat`: keine Änderung (FC-Erkennung via baseStateAfter ist schon da).
- Multi-AB-Stack: keine Änderung.
- Out-Counter `computeOutIndices`: erweitern um Stealing-Events mit `CAUGHT_STEALING | OUT_ON_PLAY` (für 3-Outs-Auto-Switch). Aber: Stealing-Events haben keine `id` die als AB-Out-Index reicht — wir brauchen eine Inning-weite Out-Sequenz. Vereinfachung: `computeOutIndices` returnt weiterhin Map<AB.id → "I"/"II"/...>; Backend hält separat einen `outsThisInning`-State der alle Out-Events umfasst.

### DiamondCell (`DiamondCell.tsx`)

- WP/PB-Marker: kleines Label oben über Diamond, zwischen Out# und RBI-Dots. Z.B. "WP" in orange.
- SB-Arrow: Farbe rot bleibt; WP/PB-Arrow: orange (#f97316) damit unterscheidbar.

### OutDetailDrawer (`OutDetailDrawer.tsx`)

- FC-Option: bestehendes "Runner out — Batter safe an 1B" → outType=FIELDERS_CHOICE setzen.
- Sac-Bunt-Toggle: bei Grounder-Out mit explizitem "Bunt"-Trigger (neue Action-Karte im Drawer? oder Checkbox).
- Sac-Fly-Toggle: bei Fly Out + Runner-Advance-mit-Score → automatisch aktiv ODER expliziter Toggle.
- Multi-Base-Advance-Picker: aus FlyOut-Pfad rausgezogen, von allen Out-Typen aus aufrufbar via "Runner-Advance editieren"-Button (öffnet RunnerAdvancePickerView).

### Live-Scoring-View (`SpielbogenPage.tsx`)

- Action-Bar: neuer "WP/PB"-Button neben "SB". Öffnet kleinen Picker:
  1. Typ wählen: Wild Pitch / Passed Ball
  2. Runner-Advance-Picker (RunnerAdvancePickerView reused)
  3. Submit erzeugt 1+ StealingEvents mit type=WP/PB pro betroffenem Runner.

### PDF-Export (`spielbogenPdfExport.ts`)

- WP/PB-Notation: Mini-Label oben am Cell. Orange-Farbe.
- Sac-Suffix am Label: "F8 SF", "1-3 SH".

## Edge Cases / Open Questions

1. **WP+PB gleichzeitig** — selten; modelliert als 1 Event mit dem zuerst eingegebenen Typ. Korrektur via Undo+Re-enter.
2. **WP/PB vor Pitch geschehen?** — kann in Praxis vor jeder beliebigen Action passieren. Stellung im Inning-Sequence-Counter: vor dem nächsten AB einsortiert (ähnlich wie Stealing).
3. **Auto-Switch bei Walk-off** — wenn Heim im Bottom-Inning den entscheidenden Run macht, Inning bricht sofort ab. Sollte Auto-Switch unterdrückt sein? **Entscheidung:** ja, wenn `inningRuns[currInning].home > inningRuns[currInning].away` UND `currInning >= 7` UND seit-Halbinning-Anfang führt Heim → Game ist effektiv vorbei. Trigger Game-End-Hint via Toast statt Auto-Switch. User entscheidet selbst per "Spiel beenden"-Button.
4. **Sac Fly mit 0 Runs (z.B. Runner thrown out at home)** — kein RBI, kein SF-Flag. Picker-Logik: SF-Flag nur setzen wenn Runner via Tag-Up tatsächlich Home erreicht.
5. **Runner-Advance-Picker default** — bei Force-Out: Runner +1 vorausgewählt; bei FC: Runner-Out-Pick (welcher Runner) + Batter auf 1B; bei Grounder-Out (kein Force): Runner bleibt vorausgewählt.

## Implementation Order

1. P1.2 (FC OutType) — kleinster Diff, isolierter Test.
2. P1.1 (WP/PB) — Backend-Enum + Frontend-Drawer + Cell-Marker.
3. P1.3 (Multi-Base-Advance bei allen Out-Typen) — Refactor RunnerAdvancePickerView.
4. P2.6 (Sac-Flags) — DB-Migration + AB-Drawer-Toggles.
5. P2.5 (3-Outs-Auto-Switch) — Backend-Service-Erweiterung, Toast.

## Tests (verbindlich pro Edge Case)

Jeder Edge Case bekommt **mindestens 1 Backend-Integrationstest** + **mindestens 1 Frontend-Renderer/Unit-Test**. Zusätzlich End-to-End-Replay-Test (Backend) der ganze Innings durchscort und finalen State + Cell-Notations validiert. Ziel: Regressionsschutz — wenn jemand später am Renderer/Service schraubt, fallen alle Cases auf.

### Backend (Spring Boot, Testcontainers + PostgreSQL)

Neue Test-Klasse `SpielbogenEdgeCasesIntegrationTest.java`:

| Case | Test |
|------|------|
| FC | `fielders_choice_records_batter_safe_on_first_runner_out`: AB result=OUT outType=FIELDERS_CHOICE chain=[6,4]; assert baseStateAfter.firstSlotId=batter, runner gone, 1 out counted |
| WP | `wild_pitch_advances_runner_without_sb_credit`: Runner auf 2B, WP-Event from=2 to=3; assert StealingEvent.type=WILD_PITCH, baseState updated, 0 outs |
| PB | `passed_ball_advances_runner`: analog WP mit type=PASSED_BALL |
| WP/PB Multi-Base | `wild_pitch_runner_advances_two_bases`: Runner auf 1B, WP from=1 to=3; assert toBase=3, baseState.thirdSlotId=runner |
| Multi-Base auf Out | `grounder_out_with_overthrow_runner_scores_from_first`: Runner auf 1B, AB OUT (Grounder), baseStateAfter.firstSlotId=null, runsScored=1 (E5 + Runner Home) |
| Sac Bunt | `sac_bunt_marks_at_bat_correctly`: AB result=OUT outType=GROUNDER sacrificeType=BUNT; assert sacrificeType persistiert, AB returnt mit Flag |
| Sac Fly | `sac_fly_marks_at_bat_with_rbi`: Runner auf 3B, AB result=OUT outType=FLY sacrificeType=FLY runsScored=1 rbi=1; assert Flag + RBI |
| 3-Outs-Auto-Switch (AB) | `three_strikeouts_auto_switch_side`: 3x recordAtBat STRIKEOUT in HOME; assert currentSide=AWAY nach 3. Out |
| 3-Outs-Auto-Switch mit Pickoff | `pickoff_as_third_out_auto_switches`: 2x STRIKEOUT, dann Stealing-Event type=OUT_ON_PLAY; assert Auto-Switch |
| 3-Outs-Auto-Switch mit Caught-Stealing | `caught_stealing_as_third_out_auto_switches`: 2x STRIKEOUT, dann CAUGHT_STEALING; assert Auto-Switch |
| Auto-Switch unterdrückt bei Walk-off | `walk_off_does_not_auto_switch`: Inning 7 Bottom, Heim macht winning-Run via HR; assert kein Auto-Switch (User muss manuell beenden) |
| Inning-Sequence | `inning_sequence_counts_all_out_events`: gemischt AB-Outs + Stealing-Outs in einem Inning; assert outsThisInning korrekt, kein Premature-Switch |

End-to-End-Replay-Test `SpielbogenScoringScenarioTest.java`:

- `replays_real_rfl_game_from_image_24`: Hardcoded Sequenz von ABs + Stealings die exakt das Bild reproduziert. Assert: finale Runs, finale Cell-Notations (über GET /spielbogen/{id} Response), Out-Counter pro Inning, RBI-Summen.
- `replays_walk_off_scenario`: Bottom 7, Bases Loaded, Walk → Run scort, Game beendbar.
- `replays_inning_with_double_play_and_overthrow`: DP klemmt 2 Outs, dann Overthrow → Runner advance. Assert finaler State.

### Frontend (Vitest + Testing Library — falls noch nicht vorhanden Setup einbauen)

Neue Test-Files:

`bogenSheetRenderer.test.ts`:
- `computeScoredSet_marks_runner_who_scored_via_subsequent_hits`
- `computeScoredSet_marks_homerun_batter`
- `computeScoredSet_does_not_mark_runner_who_was_force_out`
- `computeOutIndices_returns_range_for_double_play` ("I-II")
- `computeOutIndices_returns_range_for_triple_play` ("I-III")
- `computeOutIndices_handles_partial_dp_at_inning_close` ("II-III")
- `reachedBaseForAtBat_fc_batter_on_first` (FC: result=OUT, baseStateAfter.firstSlotId=batter → reach=1)
- `reachedBaseForAtBat_homerun_full_circuit` (reach=4)
- `reachedBaseForAtBat_grounder_out_no_reach` (reach=0)
- `renderCells_multi_ab_in_same_cell_keeps_both_labels`
- `renderCells_wp_event_advances_runner_with_orange_marker`
- `renderCells_passed_ball_event_advances_runner`
- `renderCells_sacrifice_fly_label_has_sf_suffix`
- `renderCells_fielders_choice_label_starts_with_FC`

`DiamondCell.test.tsx` (Snapshot + Rendering):
- Render mit jedem CellNotation-Permutation: leer, 1B, HR, FC, Sac Fly, WP, mehrere ABs, RBI 1/2/3.
- Snapshot SVG-Output für jeden Case → bei Visuellen-Regressionen sofort sichtbar.

`OutDetailDrawer.test.tsx`:
- Tag-Up-Picker cyclet bleibt → 2B → 3B → Home → bleibt.
- FC-Submit mit picked-Runner setzt outType=FIELDERS_CHOICE.
- Sac-Fly-Toggle setzt sacrificeType.
- Multi-Base-Advance-Picker erreichbar von Grounder-Out (nicht nur Fly Out).

### Frontend Test-Setup

Aktuell hat das Frontend kein Test-Runner. Setup einbauen:
- `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` als devDependencies.
- `vitest.config.ts` mit jsdom-environment.
- npm-Script `npm test`.
- Pre-Commit-Erwartung: `npm test` muss grün sein für Spielbogen-Pfad.

### Test-Daten-Fixtures

`backend/src/test/resources/fixtures/spielbogen/` mit JSON-Replays realer Spiele (anonymisiert). Test lädt Fixture, schickt Sequenz Schritt-für-Schritt durch Service, vergleicht jeden Tick gegen erwarteten Snapshot. Macht Regressionssuche trivial: bei Bug einfach Fixture anschauen.

### CI

GitHub Actions: bestehender Workflow erweitert um `npm test` Schritt nach Build. Failing Frontend-Tests blocken Deploy genau wie failing Backend-Tests.

## Stats-Konsequenzen (späterer Service)

- AB-Counter: `result IN (SINGLE, DOUBLE, TRIPLE, HOMERUN, OUT, STRIKEOUT) AND sacrificeType IS NULL`. (Walks/HBP/SAC zählen nicht.)
- Hit-Counter: `result IN (SINGLE, DOUBLE, TRIPLE, HOMERUN)`.
- AVG: hits / AB.
- OBP: (hits + walks + HBP) / PA.
- SB-Counter: nur StealingEvents mit type=STOLEN_BASE (NICHT WP/PB).
