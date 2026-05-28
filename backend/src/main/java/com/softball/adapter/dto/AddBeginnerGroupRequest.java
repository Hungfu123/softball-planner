package com.softball.adapter.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Request für POST /api/training-plans/{id}/beginner-group — fügt einen Anfänger-Block
 * zu einem existierenden Plan hinzu, ohne diesen neu zu generieren.
 *
 * - beginnerCount: Anzahl Anfänger (min 2)
 * - beginnerFocus: optional separater Focus für Anfänger; leer = gleicher Focus wie
 *   Hauptgruppe + BASIC-Filter
 */
public record AddBeginnerGroupRequest(
        @NotNull @Min(2) Integer beginnerCount,
        String beginnerFocus
) {}
