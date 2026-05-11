# resetScoring: Substitutions auch löschen + Reset-E2E-Suite

**Datum:** 2026-05-11
**Scope:** Backend `GameScoringService.resetScoring` + E2E-Tests.

## Problem

Phase 3 E2E-Implementation deckte Bug auf: `resetScoring(gameId)` löscht AtBats, Stealings, InningAdvanceEvents, setzt Score=0 + battingSide=null + endedAt=null — aber **NICHT** Substitutions. Cross-Test-Pollution war die Folge; Phase 3 musste Workaround via `clearSubstitutions`-Helper bauen.

Auch User-facing Risiko: User klickt Reset im Live-Scoring, erwartet "alles auf Anfang", aber Substitution-State aus dem zurückgesetzten Spiel bleibt → currentBatter kann falsch sein, Spieler "verschwinden" aus aktiven Positions.

## Lösung

### Backend-Fix
`GameScoringService.resetScoring` zusätzlich `substitutionRepository.deleteByGameId(gameId)` aufrufen. Port hat die Methode bereits.

### E2E Reset-Suite
3 Tests die Reset-Symmetry verifizieren:

| Test | Setup | Action | Assertion |
|---|---|---|---|
| `reset_clearsAllScoringState` | 1 AB + 1 Stealing + 1 Sub + 1 InningAdvance | Reset via Backend-API | ABs=0, Stealings=0, Subs=0, Events=0, Score=0/0, battingSide=null, endedAt=null |
| `reset_clearsSubstitutions` | 1 Sub | Reset | Subs=0 (regression-test für den Bug) |
| `reset_alreadyEnded_clearsEndedAt` | Game beendet (endedAt set) | Reset | endedAt=null, ready for re-scoring |

Helper `resetScoring` aus Phase 1 wird genutzt.

## Files

**Geändert:**
- `backend/src/main/java/com/softball/application/GameScoringService.java` — 2 Zeilen Sub-Delete in resetScoring.
- `backend/src/test/java/com/softball/application/GameScoringServiceTest.java` — neuer Test `resetScoring_clearsSubstitutions`.
- `frontend/e2e/helpers/fixtures.ts` — den Workaround `clearSubstitutions`-Call aus `scoringPage`-Fixture entfernen (nicht mehr nötig).
- `frontend/e2e/helpers/api.ts` — optional: `clearSubstitutions`-Export entfernen falls nicht woanders genutzt.

**Neu:**
- `frontend/e2e/scoring/scoring-reset.spec.ts` — 3 Tests.

## Backend Tests

Unit-Test in `GameScoringServiceTest`:
```java
@Test
void resetScoring_clearsSubstitutions() {
    mockGame();
    when(atBatRepository.findByGameIdOrderBySequenceAsc(1L)).thenReturn(List.of());
    when(stealingRepository.findByGameIdOrderByIdAsc(1L)).thenReturn(List.of());
    when(inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());

    service.resetScoring(1L);

    org.mockito.Mockito.verify(substitutionRepository).deleteByGameId(1L);
}
```

## Risk

- Frontend-Fixture-Cleanup: wenn `clearSubstitutions` woanders genutzt wird, nicht entfernen. Nur den Aufruf in `scoringPage`-Fixture entfernen.
- Backend Test-Mocks: existierender `resetScoring_*`-Test ergänzen oder neu schreiben.

## Out of Scope

- Frontend-UI für Reset (existiert schon: "Reset"-Button im Header).
- Walkoff/Mercy (separater Spec).
- Andere "Bug X"-Items aus Audit.
