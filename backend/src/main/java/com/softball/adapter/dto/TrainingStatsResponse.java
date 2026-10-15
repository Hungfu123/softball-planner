package com.softball.adapter.dto;

/**
 * Trainingsbeteiligung eines Spielers in einem Zeitraum.
 *
 * @param attended           besuchte Trainings
 * @param totalTrainings     stattgefundene Trainings im Zeitraum — fuer alle gleich
 * @param heldSinceFirstSeen stattgefundene Trainings seit dem ersten Auftauchen DIESES
 *                           Spielers; der Nenner der Quote. Wer im Mai dazukam, hat den
 *                           April nicht versaeumt.
 * @param participation      besucht / heldSinceFirstSeen (Nenner mindestens 3). Danach
 *                           sortiert die Auto-Aufstellung — Listen, die etwas anderes
 *                           zeigen, erklaeren die Aufstellung nicht.
 */
public record TrainingStatsResponse(Long playerId, String playerName, long attended, long totalTrainings,
                                     long heldSinceFirstSeen, double participation, boolean regular) {}
