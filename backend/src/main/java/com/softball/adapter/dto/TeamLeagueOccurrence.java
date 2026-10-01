package com.softball.adapter.dto;

/** Eine Liga-Anwesenheit eines Clubs — eine Team-Zeile pro Liga/Saison.
 *  seasonId macht die Zeile eindeutig identifizierbar (Name+Jahr kann es doppeln geben). */
public record TeamLeagueOccurrence(
    Long teamId,
    Long seasonId,
    String leagueName,
    Integer year
) {}
