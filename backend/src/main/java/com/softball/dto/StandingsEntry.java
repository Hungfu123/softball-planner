package com.softball.dto;

public record StandingsEntry(
    LeagueTeamResponse team,
    int games,
    int wins,
    int losses,
    int ties,
    double winPct,
    int runsScored,
    int runsAgainst,
    int runDiff
) {}
