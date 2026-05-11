# Legacy Live-Scoring: Quick-Win Bug-Fixes

**Datum:** 2026-05-11
**Scope:** Frontend + Backend, 4 isolierte Fixes
**Aufschub:** Bug #3 (inningOverride/scoreThem-Drift) — eigene Spec, zu groß für Sammel-PR

## Audit-Bugs gefixt in diesem Spec

### Fix #6 — Manuelle Korrigieren-Button cleared recentlyScored

**Problem:** `recentlyScored` State bleibt nach Auto-CorrectionSheet-Schließen erhalten. Wenn User danach manuell "Korrigieren"-Button klickt, zeigt Sheet veraltete "war Home"-Marker.

**Fix:** Beide `setShowCorrection(true)`-Calls in manueller Button-Variante (ScoringPage.tsx:851 + :1834) machen vorher `setRecentlyScored([])`.

**Side-Effekt akzeptiert:** Wenn User Auto-Sheet ohne Save schließt + manual Korrigieren öffnet, gehen Auto-Markierungen verloren. User cycled neu. Seltener Workflow.

### Fix #8 — Overthrow submitting-Guard

**Problem:** Schneller Doppelklick auf Overthrow → race. Beide reads sehen stale `lastAtBat`, beide setzen +1, Backend persistiert nur letzten — runsScored +1 aber BaseState +2 advanced.

**Fix:** `handleOverthrow` (ScoringPage.tsx:395+) bekommt frühen `if (submitting) return`-Guard.

### Fix #11 — Backend resetScoring setzt endedAt=null

**Problem:** `GameScoringService.resetScoring` löscht ABs/Stealings + setzt Score auf 0 + battingSide=null, lässt aber `game.endedAt` unverändert. Nach Reload erscheint Game als "beendet" trotz Reset. Frontend hat Workaround via separatem `reopenGame`-Call.

**Fix:** `GameScoringService.resetScoring` (line 94-110) setzt zusätzlich `game.setEndedAt(null)`.

**Side-Effekt akzeptiert:** Frontend `reopenGame`-Call redundant aber harmlos (no-op wenn endedAt schon null). Cleanup separat.

### Fix #2-Light — recordStealingEvent Logger-Warning

**Problem:** Backend `recordStealingEvent` akzeptiert beliebige `runnerId` ohne Validation. CS/OUT_ON_PLAY für nicht-auf-Base-Runner erzeugt Geister-Out im `runnerOuts`-Counter (line 237-241).

**Fix (Light):** Logger.warn wenn `runnerId` nicht im aktuellen Game-Lineup oder Substitution-Set vorhanden. Kein Hard-Reject.

**Verzicht auf Hard-Reject:** BaseState-Rekonstruktion (Fold-Logik aus getScoreboard) zu fragil für Validation in recordStealingEvent. Hard-Validation könnte legitime Events ablehnen. Light-Variant gibt Diagnostik ohne Risk.

**Side-Effekt akzeptiert:** UI verhindert via displayRunners-Quelle den invalid-runnerId-Case ohnehin. Logger ist Defense-in-Depth für API-direkte Aufrufe / zukünftige UI-Bugs.

## Out of Scope

- **Bug #3** (inningOverride + scoreThem-Drift bei Undo) — Multi-file rewrite mit DB-Migration. Eigener Spec.
- **Bug #4** (Math.max-Clamp UI-Mismatch) — Minor, Edge-Case, lassen.
- **Bug #5** (inningTransition Flackern) — Cosmetic, lassen.
- **Bug #7** (Walkoff/Mercy-Rule) — Feature-Gap nicht Bug.
- **Bug #9** (Sub-Constraint Toast) — Minor UX, lassen.
- **Bug #10** (useScoring.error ungelesen) — Minor, lassen.

## Tests

- Fix #11: Backend-Test in GameScoringServiceTest — `resetScoring_clearsEndedAt`.
- Fix #2-Light: Backend-Test — `recordStealingEvent_logsWarn_whenRunnerNotInLineup` (oder Skip wenn Logger-Tests in Codebase nicht etabliert).
- Fix #6 + #8: keine neuen Tests, manueller Smoke-Test reicht (UI-State).

## Commit-Reihenfolge

1. Fix #6 — `🐛 Live-Scoring: Korrigieren-Button cleared stale recentlyScored`
2. Fix #8 — `🐛 Live-Scoring: Overthrow submitting-Guard gegen Double-Click Race`
3. Fix #11 — `🐛 Live-Scoring Reset: endedAt=null mit setzen`
4. Fix #2-Light — `🐛 Live-Scoring: Logger-Warn bei Stealing mit unknown runner`

Frontend-Build + Backend-Tests nach jedem Commit grün.
