package com.softball.adapter.dto;

/** Eine Liga-Anwesenheit eines Clubs — eine Team-Zeile pro Liga/Saison. */
public record TeamLeagueOccurrence(
    Long teamId,
    String leagueName,
    Integer year
) {}
