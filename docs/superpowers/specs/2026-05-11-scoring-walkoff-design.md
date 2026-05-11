# Live-Scoring: Walkoff-Erkennung

**Datum:** 2026-05-11
**Scope:** Frontend nur. Backend unverändert (endGame-Endpoint existiert).

## Problem

Aktuell endet das Spiel im legacy Live-Scoring NUR wenn `halfInningOver && displayInning >= 7 && !isTied`. Heimteam-Walkoff (Lead-Run im Bottom-Half von Inning 7+ ohne 3 Outs) wird NICHT erkannt → Banner zeigt nicht, User muss manuell "Beenden" klicken ohne Indikator dass das Spiel laut Regelwerk vorbei ist.

## Lösung

Walkoff-Bedingung Frontend-seitig erkennen + `gameOver` erweitern. Banner zeigt Walkoff-spezifische Copy.

**Backend bleibt unangetastet** — kein Auto-Trigger. User klickt "Beenden" im Header wie gewohnt, wenn er bestätigen will. Vorteil: Undo des walkoff-AB bringt Banner sauber zurück (Re-Computation), keine inconsistency zwischen `endedAt` und Game-State.

## Walkoff-Bedingung

```
walkoff = !manualGameOver
       && displayInning >= 7         // Regulation oder Extra-Innings
       && battingSide === 'bottom'   // Wir sind Heimteam
       && (scoreUs > scoreThem)      // Wir führen
       && atBats.length > 0          // mindestens 1 AB existiert
```

Alle Bedingungen müssen erfüllt sein. Wenn ein Run in Bottom 7+ gescort wird, der uns über den Gegner bringt → walkoff=true. Banner erscheint.

## gameOver Update

```typescript
const gameOver = manualGameOver || (regulationOver && !isTied) || walkoff
```

## Banner-Copy

Aktuell:
```
🏆 Spiel beendet
Wir haben gewonnen! · Endstand 6:3
```

Mit Walkoff:
```
🏆 Walkoff-Sieg!
Endstand 6:3 · Bottom-Inning {N} beendet das Spiel
```

Computed: `walkoffWin = walkoff` (boolean), Banner-Text inline conditional.

## E2E Test

`frontend/e2e/scoring/scoring-walkoff.spec.ts`:

| Test | Setup | Action | Assertion |
|---|---|---|---|
| `walkoff_bottom7th_homeTeamScores_endsGame` | bottom 7th, scoreThem=2, scoreUs=1, runner3B | SINGLE (3B scores → scoreUs=2... wait, scoreThem=2 too → tied. Use HOMERUN bases-loaded for clear lead) | gameOver=true (visible "Walkoff" banner) |
| `walkoff_top7th_doesntTrigger` | top 7th, scoreThem=1, scoreUs=2 | SINGLE | gameOver=false (top half, not walkoff) |
| `walkoff_undoneByABUndo` | walkoff achieved | Undo last AB | gameOver=false (walkoff condition lifted) |

3 Tests.

## Files

**Geändert:**
- `frontend/src/components/scoring/ScoringPage.tsx` — `walkoff` computation, `gameOver` erweitert, Banner-Copy.

**Neu:**
- `frontend/e2e/scoring/scoring-walkoff.spec.ts`

## Out of Scope

- Mercy-Rule (10-Run-Diff). User-Wunsch: nicht implementieren.
- Backend Auto-endGame.
- Visual screenshot-regression für Banner.
