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

## Key Frontend Files
- `components/spielbogen/SpielbogenPage.tsx` — Main page, orchestriert alle Drawers/Sheets, handleRecord/handleRecordStealing/Undo
- `components/spielbogen/BogenDiamondView.tsx` — animiertes Diamond mit Runner-Bewegungen (motion/react). `outSlotIds` Prop: Runner die als OUT verschwinden faden in-place statt zu Home zu laufen
- `components/spielbogen/BogenActionButtons.tsx` — TREFFER/STRIKEOUT/AUS Tier-1 Pills + MEHR-Menu (Substitution/Stealing/PitchingEvent/Automatisches Out)
- `components/spielbogen/OutDetailDrawer.tsx` — Field-SVG zum Fielder-Pick → InfieldOptions/RunnerOutPicker/RunnerAdvancePicker/ChainPicker. Force-Out-Detection (`isForceOutFromBase`) ändert ChainPicker-Title auf "Force-Out — wer hat Base touched?"
- `components/spielbogen/HitAdjustSheet.tsx` — Auto-opens nach SINGLE/DOUBLE/TRIPLE bei Runnern. Tap-Cycle Runner-Positionen + Force-Out-3rd-Out-Regel (Run zählt nicht bei Force-Out 3rd-Out)
- `components/spielbogen/CorrectionSheet.tsx` — nachträgliche Anpassung letzter AB ohne Delete
- `components/spielbogen/LastAtBatPreview.tsx` — Strip unter Diamond mit Klartext + UNDO-Pille (dauerhaft sichtbar) + Korrektur-Icon (SquarePen)
- `components/spielbogen/RflSheetDrawer.tsx` — vollständiges Sheet mit allen Innings (1-7), table-fixed Layout, responsive Mobile/Desktop
- `components/spielbogen/DiamondCell.tsx` — eine Zelle des Sheets, viewBox 60×80 SVG
- `components/spielbogen/StealingDrawer.tsx`, `PitchingEventDrawer.tsx`, `SubstitutionDrawer.tsx`
- `utils/bogenSheetRenderer.ts` — `renderCells()` produces `CellMap` von cellKey→CellNotation. Kernfunktionen:
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

## Vermeintliche Bugs / Häufige Verwirrung
- **"Inning geht nach 3 Outs weiter"**: meistens Wrap-Around. Sheet rendert per Lineup-Row, NICHT chronologisch. Multiple Cells im selben Inning-Column zeigen ABs in Lineup-Reihenfolge. Inning-End-Marker und Roman-Labels (I/II/III) verraten chronologische Out-Reihenfolge.
- **"Diagonale auf Cell mit nur Roman 'I'"**: Cell hat 3 Events: AB seq=N war 1. Out (I) UND späterer Stealing-Event auf gleichem Slot war 3. Out (III). Out-Index zeigt "I·III" kombiniert. Falls nur "I" sichtbar → cache-stale, hard-reload.
- **"DP zeigt nur 6-4 statt 6-4-3"**: User hat im ChainPicker den 3. Fielder vergessen. Backend speichert outType=DOUBLE_PLAY trotzdem (zählt 2 Outs richtig). Notation jedoch unvollständig — Pre-fill ChainPicker mit `[fielder, defaultDpPartner, 3]` als TODO.
- **"5-2 DP" obwohl SS gepickt wurde**: User hat im Field-SVG versehentlich 3B (Pos 5) statt SS (Pos 6) getappt. Eng nebeneinander. Plus ChainPicker startet mit nur `[initialFielder]` — User muss Rest selbst tappen.
- **PWA-Cache** ist aggressiv (NetworkFirst /api mit 5s-Timeout, sw.js precaches assets). Bei UI-Bugs immer erst `Application → Clear site data` + Service-Worker unregister bevor Code-Änderung vermutet wird.
