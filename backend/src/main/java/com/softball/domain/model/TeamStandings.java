package com.softball.domain.model;

public record TeamStandings(
    LeagueTeam team,
    int games,
    int wins,
    int losses,
    int ties,
    double winPct,
    int runsScored,
    int runsAgainst,
    int runDiff
) {}
