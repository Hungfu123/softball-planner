# Spielbogen — Live Scoring + RFL Sheet

Live-Scoring-Feature für Softball-Spiele mit deutscher RFL-Konvention (Ruhr-Fun-Liga). Zwei Scoring-Pfade existieren:
- **`ScoringPage`** (legacy, einfaches Inning-Scoring, route `/gameday/:id/scoring/:gameIndex`)
- **`SpielbogenPage`** (neuer Live-Bogen mit komplettem RFL-Sheet + PDF-Export, route `/spielbogen/:id`)

User arbeitet primär an **Spielbogen** weiter. Beide existieren parallel.

## Spielbogen-Flow
1. `/spielbogen` Liste → "Neuer Bogen" Wizard (`SpielbogenWizard`)
2. Lineup-Setup für HOME/AWAY (`SpielbogenSlot` Records, Side+Slot+Player+Position+BattingOrder)
3. `SpielbogenPage` LIVE: Action-Pills (TREFFER/STRIKEOUT/AUS) → Sheets/Drawers für Detail-Eingabe
4. Backend trackt `currentSide`/`currentInning`, Auto-Switch bei 3 Outs
5. Spiel beenden → `status=DONE` → Liga-Senden (an LeagueResult) + PDF-Export

## Key Backend Files
- `application/SpielbogenScoringService.java` — recordAtBat, recordStealing, undoLast, switchSide, correctLastAtBat, maybeAutoSwitchSide
- `domain/model/Spielbogen.java`, `SpielbogenSlot.java`, `SpielbogenAtBat.java`, `SpielbogenStealing.java`
- `adapter/in/web/SpielbogenController.java` — REST endpoints
- `adapter/out/persistence/repository/SpringSpielbogenAtBatRepository.java` — `countWeightedOutsInInning` (DP=2 outs, TP=3, K/OUT/AUTOMATIC_OUT=1, Error=0)
- `domain/service/BogenScoreCalculator.java` — `calculateInningRuns` (Linescore-Zahlen je Inning, inkl. Steal-Runs, siehe Domain-Regeln unten) und `calculateTeamTotals` → `TeamTotals(runs, hits, errors)` für R/H/E im Scoreboard

## Key Frontend Files
- `components/spielbogen/SpielbogenPage.tsx` — Main page, orchestriert alle Drawers/Sheets, handleRecord/handleRecordStealing/Undo
- `components/spielbogen/BogenDiamondView.tsx` — animiertes Diamond mit Runner-Bewegungen (motion/react). `outSlotIds` Prop: Runner die als OUT verschwinden faden in-place statt zu Home zu laufen
- `components/spielbogen/BogenActionButtons.tsx` — TREFFER/STRIKEOUT/AUS Tier-1 Pills + MEHR-Menu (Substitution/Stealing/PitchingEvent/Automatisches Out)
- `components/spielbogen/OutDetailDrawer.tsx` — Field-SVG zum Fielder-Pick → InfieldOptions/RunnerOutPicker/RunnerAdvancePicker/ChainPicker. Force-Out-Detection (`isForceOutFromBase`) ändert ChainPicker-Title auf "Force-Out — wer hat Base touched?"
- `components/spielbogen/HitAdjustSheet.tsx` — Auto-opens nach SINGLE/DOUBLE/TRIPLE bei Runnern. Tap-Cycle Runner-Positionen + Force-Out-3rd-Out-Regel (Run zählt nicht bei Force-Out 3rd-Out)
- `components/spielbogen/CorrectionSheet.tsx` — nachträgliche Anpassung letzter AB ohne Delete
- `components/spielbogen/LastAtBatPreview.tsx` — Strip unter Diamond mit Klartext + UNDO-Pille (dauerhaft sichtbar) + Korrektur-Icon (SquarePen)
- `components/spielbogen/BogenSheetDrawer.tsx` (ehemals `RflSheetDrawer.tsx`) — Drawer aus `SpielbogenPage`, zeigt seit dem Live-Feed-Umbau `BogenLiveFeed` + `BogenLineupAccordion` statt des RFL-Gitters. Footer-Actions PDF-Export/An Liga senden/Spiel beenden. **Das komplette RFL-Gitter (Tabelle mit allen Innings) existiert nur noch im PDF-Export** — `utils/bogenSheetRenderer.ts` selbst bleibt aber auch für Live-UI im Einsatz, siehe unten
- `components/spielbogen/BogenLiveFeed.tsx` — Scoreboard (dunkler Block) + Linescore-Tabelle (Innings-Spalten, R/H/E aus `homeTotals`/`awayTotals`, Zellen sind Sprungziele zur passenden Halbinning) + Play-by-Play-Feed (neueste Halbinning oben, Events chronologisch)
- `components/spielbogen/BogenLineupAccordion.tsx` — kollabierter Aufstellungs-Block unter dem Feed, HEIM/GAST-Umschalter. `onEditSlot` optional — fehlt er, wird kein Stift gerendert
- `utils/bogenFeed.ts` — `buildFeed()` mischt At-Bats/Stealing-Events/Substitutions zu `HalfInning[]`, sortiert nach `createdAt` (numerisch, nicht lexikalisch — Jackson serialisiert Instants ohne Bruchteil uneinheitlich), gruppiert per `halfInningId(inning, side)`, berechnet `scoreAfter` je Halbinning
- `components/spielbogen/DiamondCell.tsx` — eine Zelle des Sheets, viewBox 60×80 SVG
- `components/spielbogen/StealingDrawer.tsx`, `PitchingEventDrawer.tsx`, `SubstitutionDrawer.tsx`
- `utils/bogenSheetRenderer.ts` — nicht nur vom PDF-Export (`spielbogenPdfExport.ts`) verwendet, sondern auch live: `LastAtBatPreview.tsx` importiert `renderCells`/`cellKey` für die Klartext-Strip zum letzten AB, `SpielbogenPage.tsx` importiert `abOutsAdded` für die Live-Out-Zählung. **Nicht löschen** — nur das RFL-Gitter als komplette Tabelle lebt allein noch im PDF; die Datei selbst ist keine PDF-only-Altlast, ein Löschen würde zusätzlich die Live-Out-Zählung und die Letzter-AB-Strip brechen. `renderCells()` produces `CellMap` von cellKey→CellNotation. Kernfunktionen:
  - `computeScoredSet` — wer scort gemerkt by Diff zw. baseStateBefore/After
  - `computeCellOutIndices` — Roman-Labels (I/II/III, DP "I-II", TP "I-III", multi-event "I·III") **inkl. Stealing-Outs** (CS/OUT_ON_PLAY)
  - `computeInningEndKeys` — wo fiel das 3. Out (markiert Cell mit kleinem Slash am rechten Border)
  - `abOutsAdded` — Outs eines ABs (K/OUT/AUTOMATIC_OUT=1, DP=2, TP=3, Error=0). Einzige Quelle für AB-Out-Zählung: outIndex, Inning-End und `SpielbogenPage.computeOuts` nutzen sie
  - `sideAnnotations` — löst Steal-Kürzel + Advance-×N zu **max einem Label pro Base-Seite** auf (Precedence: Stealing-Event > Advance-Label). DiamondCell und PDF-Export rendern nur daraus
  - **Wichtig:** sortKey für ABs = `ab.sequence` (NICHT createdAt — wird von correctLastAtBat aktualisiert). Stealings interpolieren via `priorSeq + 0.5`
- `utils/spielbogenPdfExport.ts` — jsPDF-Renderer, paralleler Code zu DiamondCell für PDF-Output

## Domain-Regeln (don't break!)
- **Outs zählen:** DP=2, TP=3, K=1, OUT=1, AUTOMATIC_OUT=1, Error=0. Backend: `countWeightedOutsInInning`, Frontend: `abOutsAdded`.
- **Automatisches Out** (fehlende Spielerin) ist ein AB mit `result=AUTOMATIC_OUT`, kein separates Event (anders als Legacy-Scoring mit eigener `AutomaticOutEvent`-Tabelle). Dadurch erben Out-Zählung, 3rd-Out-Auto-Switch, Out-Index und Undo den normalen AB-Pfad. Zählt **weder als At-Bat noch als Plate Appearance** (`AtBatResult.countsAsAtBat()` = false). Backend lehnt outType/fielderChain/isError/sacrificeType/runs/rbi/runnerAdvances darauf ab; Base-State bleibt unverändert. Trigger: Tap auf die Out-Punkte im Live-Strip **oder** MEHR-Menu → beide öffnen denselben ConfirmModal.
- **Auto-Switch:** Backend `maybeAutoSwitchSide` bei Outs ≥ 3. HOME 3.Out → side=AWAY (gleiche Inning). AWAY 3.Out → side=HOME, inning+1.
- **Undo nach 3rd-Out** revertet Side+Inning wenn Outs nach Delete unter 3 fallen (`SpielbogenScoringService.undoLast`).
- **Force-Out 3rd-Out-Regel** (Softball): bei Force-Out als 3. Out zählt gleichzeitig erzielter Run NICHT (Inning endet vor Run). HitAdjustSheet zeigt Amber-Warnung mit Checkbox.
- **DH-Notation:** im Spielbogen-Lineup als `position='DH'` gespeichert. DH-Spieler hat eigenen `SpielbogenSlot` Eintrag (anders als beim normalen Lineup wo DH eine Annotation ist).
- **Stealing-Events** sind separate Records (nicht ABs). Types: `STOLEN_BASE`, `CAUGHT_STEALING`, `OUT_ON_PLAY`, `WILD_PITCH`, `PASSED_BALL`. CS/OUT_ON_PLAY zählen als Outs.
- **HitAdjustSheet onConfirm** macht 2 Backend-Calls: `correctLastAtBat` + `recordStealing(OUT_ON_PLAY)` für jeden Runner-Out aus Tap-Cycle UI.
- **Linescore-Runs zählen auch Steal-Runs:** `BogenScoreCalculator.calculateInningRuns` zählt neben `ab.runsScored` auch Stealing-Events, die mit `toBase=HOME_PLATE` enden (STOLEN_BASE, WILD_PITCH, PASSED_BALL — CAUGHT_STEALING/OUT_ON_PLAY zählen trotz `toBase=4` nicht, das sind Outs). Vorher fehlte ein per SB/WP/PB nach Hause gekommener Runner in der Inning-Spalte, obwohl der Gesamtstand ihn schon enthielt.
- **Error-Zuordnung zur feldenden Mannschaft (Fallstrick!):** `SpielbogenAtBat.isError` sitzt auf dem AB der **schlagenden** Seite (der Batter reicht auf einen Fehler). `BogenScoreCalculator.calculateTeamTotals(side)` zählt einen Error aber der **jeweils anderen** Seite an (`ab.getSide() != side && isError`) — ein Error ist ein Fielding-Fehler, gehört also ins E der Feld-Mannschaft, nicht in die Zeile des Batters. Beim Lesen des Codes wirkt `ab.getSide() != side` im ersten Moment wie ein Bug; es ist die Absicht.

## RFL-Sheet Konventionen (DiamondCell + PDF)
- **Diamond filled** (blau ausgefüllt) = Player gescort. **Outline only** = nicht gescort (auf Base oder out).
- **Wrap-Around-Slash** (große Diagonale durch Cell): bei `abCount >= 2 && !filled` — Player schlug 2× im selben Inning. Mixed-Outcomes (z.B. K + 1B) in Dreiecks-Hälften gerendert: `labels[len-2]` oben-links Triangle, `labels[len-1]` unten-rechts. Bei `filled+multi` kein Slash (Strikethrough-Effekt vermieden), Labels inline `1B 1B` zentriert.
- **Out-Index** (Roman, oben-links): "I", "II", "III" einzelne Outs. "I-II" für DP, "I-III" für TP. Multi-Event-Cell mit Stealing-3rd-Out: "I·III" (kompakter Separator).
- **Inning-End-Marker** (kleine Diagonale, unten-rechts am Border): markiert wo das 3. Out fiel. Hilft Scorekeeper für Lineup-Reihenfolge im nächsten Inning bei Wrap-Around.
- **RBI-Dots** (rote Punkte oben-rechts): max 3 angezeigt (`Math.min(rbi, 3)`).
- **×N Advance-Annotation** (an Base-Seite): RFL-Konvention — `×N` = Batting-Order-Nr des Hitters, der den Runner auf diese Base vorbrachte. Steht an jeder traversierten Base-Seite eines Runner-Advances (`AdvanceLabel.hitter`). Nur wenn Treiber ≠ Runner selbst; am eigenen Reach des Batters bleibt das Result-Label (1B/2B/…). Ersetzt den früheren abCount-Badge (der war Wiederhol-AB-Zähler, semantisch falsch — 4-6× pro Inning unrealistisch). Wiederhol-ABs zeigt weiterhin der Wrap-Around-Slash.
- **Stealing-Arrows** zwischen Bases (gestrichelt). Farben: STOLEN_BASE=rot `#dc2626`, CS/OUT_ON_PLAY=dunkelrot `#7c2d12`, WP/PB=orange `#f97316`.
- **Ein Label pro Base-Seite** (`sideAnnotations`): Steal-Kürzel (SB/CS/OUT/WP/PB) und Advance-×N teilen dieselbe Koordinate. Ein Base-Hop hat genau eine Ursache, daher gewinnt das explizite Stealing-Event; mehrere Steals auf derselben Seite ergeben ein Label. WP/PB bekommen **nie** ×N — der Runner kam durch den Pitch vor, nicht durch den Schlag. Vorher rendeten DiamondCell und PDF zwei Text-Layer auf identische Punkte → unlesbarer Überlagerungs-Mush.
- **AO** = Automatisches Out: leerer Diamond, Label "AO", normaler Out-Index.
- **IHR** = Inside-the-Park Homerun (`AtBatResult.INSIDE_PARK_HR`). Kein etabliertes RFL-Kürzel
  gefunden (`displayNameDe()` nutzt den vollen Begriff "Park-HR", zu lang für die Cell) — IHR
  gewählt, kurz und eindeutig von HR unterscheidbar. `renderAtBatBase`/`computeScoredSet`
  (`bogenSheetRenderer.ts`) behandeln IHR wie HOMERUN: gefüllter Diamond, Batter selbst zählt
  als gescort (kein "disappeared runner" wie andere Base-Runner). Fehlte dieser Case, fiel das
  Label auf den generischen Switch-Fallback zurück und druckte "OUT" für einen Homerun.
- **Layout responsive:** mobile fix-pixel Breiten, `lg:` table-fixed mit Inning-Cells ohne Width → expanden auf Viewport-Breite.

## Live-Feed
- **`BogenSheetDrawer`** (ehemals `RflSheetDrawer`) zeigt beim Öffnen aus `SpielbogenPage` nicht mehr das RFL-Gitter, sondern `BogenLiveFeed` (Scoreboard + Linescore + Play-by-Play) und darunter `BogenLineupAccordion` (kollabierte Aufstellung, HEIM/GAST-Umschalter, Stift zum Editieren des Slots). Das komplette RFL-Gitter (die volle Tabelle mit allen Innings) lebt nur noch im PDF-Export weiter — `utils/bogenSheetRenderer.ts` ist deshalb aber keine reine PDF-Altlast: `LastAtBatPreview` (Klartext-Strip zum letzten AB) und `SpielbogenPage`s Live-Out-Zählung (`abOutsAdded`) importieren ebenfalls direkt daraus. Die naheliegende nächste Aufräumaktion wäre, die Datei als "jetzt ungenutzt" zu löschen; das würde nicht nur den PDF-Export brechen, sondern auch die Live-Out-Zählung und die Letzter-AB-Strip.
- **`utils/bogenFeed.ts` (`buildFeed`)** ist die einzige Stelle, die At-Bats, Stealing-Events und Substitutions zu einer gemeinsamen Timeline mischt. Sortiert nach `createdAt`, aber numerisch (`Date.parse`), nicht als String — Jackson serialisiert einen `Instant` ohne Bruchteil-Sekunden inkonsistent zu einem mit (`...:00Z` vs. `...:00.500Z`), und lexikalisch sortiert `.` vor `Z`, was die Reihenfolge kippen würde. Gruppiert per `halfInningId(inning, side)`, neueste Halbinning zuerst.
- **Nur authentifiziert:** Der Feed lebt ausschließlich im Drawer hinter dem Login-Gate. Eine öffentliche Zuschauer-Seite war geplant (`/live/:token` mit Share-Link und `/api/public/**`), wurde vor dem Merge aber wieder entfernt — `App.tsx` gated deshalb die ganze App ohne Ausnahme hinter `LoginPage`, und `SecurityConfig` hat als einzigen `permitAll()`-Pfad unter `/api/**` weiterhin nur `/api/calendar.ics`.

## Spielzeit-Uhr

Pausierbare Stoppuhr pro Spiel/Bogen mit optionalem Zeitlimit. Identischer Backend-Service für
Spielbogen **und** Legacy-Scoring (siehe `docs/SCORING-LEGACY.md` für den Legacy-Anschluss) —
hier steht der volle Stand. Design-Herleitung inkl. Alternativen-Abwägung:
`docs/superpowers/specs/2026-08-10-spielzeit-uhr-design.md`.

### Datenmodell (V55, V56)
Vier Spalten auf `spielbogen` **und** `games`:

| Spalte | Bedeutung |
|---|---|
| `timer_running_since` | wann die Uhr **zuletzt** gestartet/fortgesetzt wurde; `NULL` = pausiert oder nie gestartet |
| `timer_accumulated_seconds` | angesammelte Sekunden vor der aktuell laufenden Phase |
| `time_limit_minutes` | Limit dieses Spiels; `NULL` = keins gesetzt (pro Spiel, nicht liga-weit) |
| `timer_started_at` | der **erste** Start (V56, nachgezogen) |

`timer_started_at` ist bewusst eine vierte Spalte, nicht aus den anderen drei ableitbar:
`runningSince − accumulated` überspringt genau die Pausenlücken — nach einer Regenpause stünde
dort ein halbe Stunde zu später Spielbeginn, auf einem Blatt, das an die Liga geht (`Zeit:`-Feld
im PDF, siehe unten).

### Rechenkern: `domain/service/GameClockCalculator`
Reine Funktion — `compute(runningSince, accumulatedSeconds, limitMinutes, endedAt, now)` →
`ClockState`, kein Spring, kein Zugriff auf DB oder Systemuhr.

**Leitgrundsatz dieser gesamten Arbeit: die Uhr liest den Spielzustand, sie schreibt nie
hinein.**

- Deckelt gegen `endedAt ?? now`. Ein beendetes Spiel mit noch laufender Uhr friert dadurch
  **ohne jeden Schreibvorgang** ein — keine der vier Stellen, die `endedAt` setzen (inklusive
  der zwei Walkoff-Pfade in `SpielbogenScoringService`), musste dafür angefasst werden.
- `overLimit` nutzt striktes `>` — exakt auf dem Limit gilt noch nicht als überschritten.
- `running` wird `false`, sobald `endedAt` gesetzt ist (unabhängig von `runningSince`) — sonst
  würde das Frontend, das lokal weiterzählt, über den eingefrorenen Wert hinauslaufen.

### Service: `application/GameClockService`
Ein Service für Legacy-`Game` **und** `Spielbogen` — Validierung und Arithmetik sind für beide
identisch, nur der Repository-Typ unterscheidet sich. Vier Aktionen, jeweils **abgelehnt statt
still ignoriert**, damit ein Doppeltipp keine Zeit verschluckt oder verdoppelt:

| Aktion | Endpunkt (Spielbogen) | Endpunkt (Legacy) | Ablehnungsregel |
|---|---|---|---|
| Start | `POST /api/spielbogen/{id}/clock/start` | `POST /api/games/{id}/clock/start` | wenn die Uhr schon läuft |
| Pause | `.../clock/pause` | `.../clock/pause` | wenn sie nicht läuft |
| Fortsetzen | `.../clock/resume` | `.../clock/resume` | wenn sie nie gestartet wurde |
| Reset | `.../clock/reset` | `.../clock/reset` | — (immer erlaubt) |

Start-Body: `StartClockRequest{ limitMinutes }` (`null` = ohne Limit). Antwort aller vier
Aktionen plus der bestehenden Lese-Endpunkte (Scoreboard, Sheet):
`ClockStateResponse{ elapsedSeconds, running, started, limitMinutes, overLimit }` — nie die
rohen Zeitstempel, damit das Frontend nie mit der eigenen (möglicherweise falsch gehenden)
Geräteuhr rechnet.

**Limit nachträglich ändern** (Schiedsrichter entscheidet um): Start auf eine pausierte Uhr
rufen. Behält `timerAccumulatedSeconds`, setzt nur `timeLimitMinutes` neu und rührt
`timerStartedAt` **nicht** an — `start()` setzt `timerStartedAt` nur, wenn es noch `null` ist.

**Die eine Ausnahme vom Leitgrundsatz — Wiederöffnen.**
`GameClockService.pauseClockBeforeReopen(Game|Spielbogen)` bankt eine laufende Uhr
(`accumulated += endedAt − runningSince`) und **muss vor** dem Nullen von `endedAt` laufen —
danach ist die Deckelung nicht mehr rekonstruierbar und die Anzeige spränge auf alle seither
verstrichenen Stunden. Drei Aufrufstellen: `GameService.reopenGame:101`,
`SpielbogenService.reopen:151`, `SpielbogenScoringService.reopenIfDone:706` (gerufen aus den
zwei Undo-Pfaden `:328`/`:679` — eine Methode deckt beide Aufrufer ab).

**Bewusst nicht gekoppelt:** der `/clock/reset`-Endpunkt und die bestehenden Scoring-Resets
(`POST /spielbogen/{id}/reset`, `DELETE /games/{id}/scoring`) sind getrennt. Ein
zurückgesetztes Spiel zeigt bis dahin die alte Zeit — sichtbar und vom Nutzer korrigierbar,
statt eine zusätzliche Kopplung in bestehenden Reset-Code zu ziehen.

**Bei Ablauf greift die App nicht ein** — ausdrückliche Nutzer-Entscheidung. Die Anzeige färbt
amber und zählt `+MM:SS über Limit` weiter; kein erzwungenes Spielende, kein blockierter
Inning-Wechsel. Ein Fehlgriff beim Starten der Uhr darf nie Folgen fürs Spielergebnis haben.

### `timerStartedAt` — Sonderrolle in den Response-DTOs
Liegt in `GameResponse`/`SpielbogenResponse`, **nicht** in `ClockStateResponse`. Grund: es ist
der einzige rohe Zeitstempel, der überhaupt nach außen geht — erlaubt, weil er ausschließlich
**wörtlich als Uhrzeit** angezeigt wird (`HH:MM`), nie in Zeit-Arithmetik einfließt. Die
Trennung von `ClockStateResponse` (reine Rechenwerte) hält diesen Unterschied im Code sichtbar.

### Frontend
- `components/shared/GameClock.tsx` — `GameClockReadout` (Label + `MM:SS`) und `GameClockRule`
  (die 3px-Linie unter dem Live-State-Strip, wird bei gesetztem Limit zum Fortschrittsbalken).
  Geteilt zwischen Spielbogen und Legacy-Scoring. Tickt lokal per `setInterval` zwischen
  Server-Updates weiter (`useTickingSeconds`) — reine Anzeige-Interpolation, keine eigene
  Datenquelle; bei Pause/Spielende exakt der Serverwert, kein Nachlaufen.
- `components/shared/GameClockStartSheet.tsx` — geteilter Start-/Reset-Dialog (`50 min`,
  `90 min`, freie Eingabe, „ohne Limit"; bei bereits gestarteter Uhr stattdessen nur „Uhr
  zurücksetzen" mit Confirm). Erreichbar über einen kleinen Options-Punkt (⋮) neben der Uhr,
  der erst erscheint, sobald die Uhr gestartet ist — Tippen auf die Zahl selbst bleibt
  Start/Pause/Fortsetzen; der Punkt trägt nur den seltenen Korrekturfall bei Fehlstart.
- Ohne gestartete Uhr rendert die Kopfzeile exakt wie vor diesem Feature — Regressionsschutz,
  geprüft in `GameClock.test.tsx` / `ScoringPage.clock.test.tsx`.

### PDF: `Zeit:`-Feld
`utils/spielbogenPdfExport.ts` — `formatStartTime(timerStartedAt)` formatiert
`sheet.meta.timerStartedAt` (`BogenSheetResponse.meta` *ist* ein `SpielbogenResponse`) als
`HH:MM` in Europe/Berlin, `null`/ungültiger Wert → leerer String. Vorher stand dort immer ein
fest leerer Platzhalter zum Handausfüllen.

### Referenzdaten: `scripts/seed-rfl-demo.mjs`
Baut per REST-API (kein Direktzugriff auf die DB) einen kompletten Spielbogen mit allen 20
Notationsformen, die Sheet und PDF-Export kennen (alle Hit-Typen inkl. Inside-the-Park-HR,
Walk/HBP/K, Groundout mit Fielder-Chain, Fly-Out, DP, TP, Reached-on-Error, Sacrifice Bunt/Fly,
Stolen Base/Caught Stealing/Steal-of-Home, Wild Pitch/Passed Ball, Substitution,
Positionswechsel, automatisches Out). Aufruf: `node scripts/seed-rfl-demo.mjs`
(`--delete <id>` zum Aufräumen eigener Testläufe).

Der bisherige Referenz-Bogen (id 143) lebte nur als Zeilen in der lokalen Dev-Datenbank und ist
verloren gegangen — dieses Skript, nicht die Zeilen, die es erzeugt, ist die eigentliche
Absicherung gegen den nächsten Verlust. **Aktuelle Referenz: Bogen 395** (Status DONE, Uhr
gestartet 10:03). Beim Aufräumen eigener Testdaten: Bogen 1 (alt) und Bogen 395 (RFL-Demo)
unangetastet lassen.

## Vermeintliche Bugs / Häufige Verwirrung
- **"Inning geht nach 3 Outs weiter"**: meistens Wrap-Around. Sheet rendert per Lineup-Row, NICHT chronologisch. Multiple Cells im selben Inning-Column zeigen ABs in Lineup-Reihenfolge. Inning-End-Marker und Roman-Labels (I/II/III) verraten chronologische Out-Reihenfolge.
- **"Diagonale auf Cell mit nur Roman 'I'"**: Cell hat 3 Events: AB seq=N war 1. Out (I) UND späterer Stealing-Event auf gleichem Slot war 3. Out (III). Out-Index zeigt "I·III" kombiniert. Falls nur "I" sichtbar → cache-stale, hard-reload.
- **"DP zeigt nur 6-4 statt 6-4-3"**: User hat im ChainPicker den 3. Fielder vergessen. Backend speichert outType=DOUBLE_PLAY trotzdem (zählt 2 Outs richtig). Notation jedoch unvollständig — Pre-fill ChainPicker mit `[fielder, defaultDpPartner, 3]` als TODO.
- **"5-2 DP" obwohl SS gepickt wurde**: User hat im Field-SVG versehentlich 3B (Pos 5) statt SS (Pos 6) getappt. Eng nebeneinander. Plus ChainPicker startet mit nur `[initialFielder]` — User muss Rest selbst tappen.
- **PWA-Cache** ist aggressiv (NetworkFirst /api mit 5s-Timeout, sw.js precaches assets). Bei UI-Bugs immer erst `Application → Clear site data` + Service-Worker unregister bevor Code-Änderung vermutet wird.
