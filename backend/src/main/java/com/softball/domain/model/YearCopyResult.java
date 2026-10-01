package com.softball.domain.model;

import java.util.List;

/** Ergebnis des "Jahr übernehmen"-Laufs: welche Ligen neu angelegt, welche übersprungen wurden. */
public record YearCopyResult(
    int templateYear,
    int targetYear,
    List<String> createdSeasons,
    List<String> skippedSeasons,
    int copiedTeams
) {}
