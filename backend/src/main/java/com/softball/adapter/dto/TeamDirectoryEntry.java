package com.softball.adapter.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Ein Club im Team-Verzeichnis: über alle Ligen fusioniert (Name-Schlüssel, analog zur
 * Gegner-Statistik) — mit Liga-Anwesenheiten, Bilanz gegen uns und Team-AVG.
 */
public record TeamDirectoryEntry(
    String clubName,
    List<TeamLeagueOccurrence> leagues,
    int games,
    int wins,
    int losses,
    int ties,
    int runsFor,
    int runsAgainst,
    BigDecimal battingAverage
) {}
