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
- `adapter/in/web/SpielbogenController.java` — REST endpoints, u.a. `POST`/`DELETE /api/spielbogen/{id}/share` für den Zuschauer-Link
- `adapter/out/persistence/repository/SpringSpielbogenAtBatRepository.java` — `countWeightedOutsInInning` (DP=2 outs, TP=3, K/OUT/AUTOMATIC_OUT=1, Error=0)
- `domain/service/BogenScoreCalculator.java` — `calculateInningRuns` (Linescore-Zahlen je Inning, inkl. Steal-Runs, siehe Domain-Regeln unten) und `calculateTeamTotals` → `TeamTotals(runs, hits, errors)` für R/H/E im Scoreboard
- `application/SpielbogenShareService.java` — erzeugt/liefert/zieht den `publicToken` zurück (32 Byte SecureRandom, base64url ohne Padding, 43 Zeichen). `resolve(token)` wirft bei unbekanntem oder zurückgezogenem Token immer `ResourceNotFoundException` (404), nie 403 — ein 403 würde bestätigen, dass der Token je existiert hat
- `adapter/in/web/PublicBogenController.java` — `GET /api/public/bogen/{token}`, unauthentifiziert, liefert `PublicBogenFeedResponse` (bewusst reduziertes DTO ohne Season/LeagueResult/publicToken), Header `X-Robots-Tag: noindex`
- `db/migration/V55__spielbogen_public_token.sql` — nullable, unique `spielbogen.public_token varchar(43)`

## Key Frontend Files
- `components/spielbogen/SpielbogenPage.tsx` — Main page, orchestriert alle Drawers/Sheets, handleRecord/handleRecordStealing/Undo
- `components/spielbogen/BogenDiamondView.tsx` — animiertes Diamond mit Runner-Bewegungen (motion/react). `outSlotIds` Prop: Runner die als OUT verschwinden faden in-place statt zu Home zu laufen
- `components/spielbogen/BogenActionButtons.tsx` — TREFFER/STRIKEOUT/AUS Tier-1 Pills + MEHR-Menu (Substitution/Stealing/PitchingEvent/Automatisches Out)
- `components/spielbogen/OutDetailDrawer.tsx` — Field-SVG zum Fielder-Pick → InfieldOptions/RunnerOutPicker/RunnerAdvancePicker/ChainPicker. Force-Out-Detection (`isForceOutFromBase`) ändert ChainPicker-Title auf "Force-Out — wer hat Base touched?"
- `components/spielbogen/HitAdjustSheet.tsx` — Auto-opens nach SINGLE/DOUBLE/TRIPLE bei Runnern. Tap-Cycle Runner-Positionen + Force-Out-3rd-Out-Regel (Run zählt nicht bei Force-Out 3rd-Out)
- `components/spielbogen/CorrectionSheet.tsx` — nachträgliche Anpassung letzter AB ohne Delete
- `components/spielbogen/LastAtBatPreview.tsx` — Strip unter Diamond mit Klartext + UNDO-Pille (dauerhaft sichtbar) + Korrektur-Icon (SquarePen)
- `components/spielbogen/BogenSheetDrawer.tsx` (ehemals `RflSheetDrawer.tsx`) — Drawer aus `SpielbogenPage`, zeigt seit dem Live-Feed-Umbau `BogenLiveFeed` + `BogenLineupAccordion` statt des RFL-Gitters. Footer-Actions PDF-Export/Link teilen/An Liga senden/Spiel beenden. **Das RFL-Gitter selbst existiert nur noch im PDF-Export** — `utils/bogenSheetRenderer.ts` bleibt deshalb bestehen, siehe unten
- `components/spielbogen/BogenLiveFeed.tsx` — Scoreboard (dunkler Block) + Linescore-Tabelle (Innings-Spalten, R/H/E aus `homeTotals`/`awayTotals`, Zellen sind Sprungziele zur passenden Halbinning) + Play-by-Play-Feed (neueste Halbinning oben, Events chronologisch)
- `components/spielbogen/BogenLineupAccordion.tsx` — kollabierter Aufstellungs-Block unter dem Feed, HEIM/GAST-Umschalter. `onEditSlot` optional — fehlt er (öffentliche Seite), wird kein Stift gerendert; derselbe Block läuft so identisch authenticated und public
- `components/spielbogen/ShareLinkModal.tsx` — Token erzeugen/anzeigen/kopieren/zurückziehen, geöffnet aus `BogenSheetDrawer` via `nested`-`ResponsiveSheet`
- `components/public/PublicBogenPage.tsx` — Route `/live/:token`, außerhalb `Layout`, Polling alle 10s nur während `status=LIVE`, sofortiger Reload bei `visibilitychange`. Rendert `BogenLiveFeed` + `BogenLineupAccordion` ohne Stift
- `utils/bogenFeed.ts` — `buildFeed()` mischt At-Bats/Stealing-Events/Substitutions zu `HalfInning[]`, sortiert nach `createdAt` (numerisch, nicht lexikalisch — Jackson serialisiert Instants ohne Bruchteil uneinheitlich), gruppiert per `halfInningId(inning, side)`, berechnet `scoreAfter` je Halbinning
- `components/spielbogen/DiamondCell.tsx` — eine Zelle des Sheets, viewBox 60×80 SVG
- `components/spielbogen/StealingDrawer.tsx`, `PitchingEventDrawer.tsx`, `SubstitutionDrawer.tsx`
- `utils/bogenSheetRenderer.ts` — nur noch vom PDF-Export (`spielbogenPdfExport.ts`) verwendet, seit `BogenSheetDrawer` das RFL-Gitter nicht mehr live rendert. **Nicht löschen** — das ist die einzige verbleibende Quelle für die RFL-Notation im PDF. `renderCells()` produces `CellMap` von cellKey→CellNotation. Kernfunktionen:
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
- **Layout responsive:** mobile fix-pixel Breiten, `lg:` table-fixed mit Inning-Cells ohne Width → expanden auf Viewport-Breite.

## Live-Feed + öffentlicher Zuschauer-Link
- **`BogenSheetDrawer`** (ehemals `RflSheetDrawer`) zeigt beim Öffnen aus `SpielbogenPage` nicht mehr das RFL-Gitter, sondern `BogenLiveFeed` (Scoreboard + Linescore + Play-by-Play) und darunter `BogenLineupAccordion` (kollabierte Aufstellung, HEIM/GAST-Umschalter, Stift zum Editieren des Slots). Das RFL-Gitter selbst lebt nur noch im PDF-Export weiter — die naheliegende nächste Aufräumaktion wäre, `utils/bogenSheetRenderer.ts` als "jetzt ungenutzt" zu löschen; das würde den PDF-Export brechen, der genau darauf noch aufsetzt.
- **`utils/bogenFeed.ts` (`buildFeed`)** ist die einzige Stelle, die At-Bats, Stealing-Events und Substitutions zu einer gemeinsamen Timeline mischt. Sortiert nach `createdAt`, aber numerisch (`Date.parse`), nicht als String — Jackson serialisiert einen `Instant` ohne Bruchteil-Sekunden inkonsistent zu einem mit (`...:00Z` vs. `...:00.500Z`), und lexikalisch sortiert `.` vor `Z`, was die Reihenfolge kippen würde. Gruppiert per `halfInningId(inning, side)`, neueste Halbinning zuerst.
- **Link teilen:** `ShareLinkModal` (aus dem Footer von `BogenSheetDrawer`) ruft `POST /api/spielbogen/{id}/share` beim Öffnen — idempotent, liefert einen bestehenden Token zurück statt einen zweiten zu erzeugen. "Zurückziehen" ruft `DELETE /api/spielbogen/{id}/share`, danach ist der alte Link tot (404 statt 403, siehe unten).
- **Öffentliche Seite:** `PublicBogenPage` unter `/live/:token`, außerhalb `Layout`, ruft `getPublicBogenFeed(token)` (`api/client.ts`, eigener `publicRequest`-Helper ohne Basic-Auth-Header) gegen `GET /api/public/bogen/{token}`. Rendert dieselben `BogenLiveFeed`/`BogenLineupAccordion`-Komponenten wie der authentifizierte Drawer — `BogenLineupAccordion` ohne `onEditSlot`, damit kein Stift erscheint. Pollt alle 10s nur solange `status=LIVE`, dazu ein sofortiger Reload bei `visibilitychange` (Tab wieder aktiv). Beim allerersten Ladefehler zeigt die Seite "Link ungültig"; ist bereits ein Stand geladen, wird ein späterer Fehlschlag stattdessen als Netzproblem interpretiert (alter Stand bleibt sichtbar, kein Rücksprung auf die Fehlerseite).
- **Kein Login nötig, aber kein offenes Scheunentor:** `SecurityConfig` erlaubt `/api/public/**` `permitAll()` — abgesichert nur über den 43-Zeichen-Token, nicht über Auth. `PublicBogenController` liefert ein eigenes, bewusst reduziertes DTO (`PublicBogenFeedResponse`, kein Season-Objekt, kein LeagueResult, kein `publicToken` selbst) und setzt `X-Robots-Tag: noindex`. `resolve(token)` unterscheidet nicht zwischen "Token gab es nie" und "Token wurde zurückgezogen" — beides 404, damit ein Angreifer per Statuscode nicht herausfinden kann, ob ein Link je existiert hat.
- **`App.tsx` gated die ganze App hinter Login** (Redirect auf `LoginPage`, wenn kein `localStorage.auth`) — mit einer einzigen Ausnahme: `pathname.startsWith('/live/')` überspringt den Gate-Check, sonst würde ein Zuschauer ohne Login nie auf die öffentliche Seite kommen. Das ist aktuell die einzige Lücke in einem sonst durchgängigen Client-seitigen Login-Gate.

## Vermeintliche Bugs / Häufige Verwirrung
- **"Inning geht nach 3 Outs weiter"**: meistens Wrap-Around. Sheet rendert per Lineup-Row, NICHT chronologisch. Multiple Cells im selben Inning-Column zeigen ABs in Lineup-Reihenfolge. Inning-End-Marker und Roman-Labels (I/II/III) verraten chronologische Out-Reihenfolge.
- **"Diagonale auf Cell mit nur Roman 'I'"**: Cell hat 3 Events: AB seq=N war 1. Out (I) UND späterer Stealing-Event auf gleichem Slot war 3. Out (III). Out-Index zeigt "I·III" kombiniert. Falls nur "I" sichtbar → cache-stale, hard-reload.
- **"DP zeigt nur 6-4 statt 6-4-3"**: User hat im ChainPicker den 3. Fielder vergessen. Backend speichert outType=DOUBLE_PLAY trotzdem (zählt 2 Outs richtig). Notation jedoch unvollständig — Pre-fill ChainPicker mit `[fielder, defaultDpPartner, 3]` als TODO.
- **"5-2 DP" obwohl SS gepickt wurde**: User hat im Field-SVG versehentlich 3B (Pos 5) statt SS (Pos 6) getappt. Eng nebeneinander. Plus ChainPicker startet mit nur `[initialFielder]` — User muss Rest selbst tappen.
- **PWA-Cache** ist aggressiv (NetworkFirst /api mit 5s-Timeout, sw.js precaches assets). Bei UI-Bugs immer erst `Application → Clear site data` + Service-Worker unregister bevor Code-Änderung vermutet wird.
