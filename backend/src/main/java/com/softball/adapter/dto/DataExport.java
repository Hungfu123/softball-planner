package com.softball.adapter.dto;

import java.time.LocalDate;
import java.util.List;

public record DataExport(
    List<PlayerExport> players,
    List<SeasonExport> seasons
) {
    public record PlayerExport(Long id, String name, Integer defaultBattingOrder) {}

    public record SeasonExport(Long id, String name, Integer year, List<GameDayExport> gameDays,
                               List<LeagueResultExport> leagueResults) {}

    public record GameDayExport(LocalDate date, String label, String location,
                                List<Long> availablePlayerIds, List<GameExport> games) {}

    public record GameExport(int gameNumber, String opponentTeamName, Integer scoreUs, Integer scoreThem,
                              List<LineupExport> lineup, List<StaffExport> staff) {}

    public record LineupExport(Long playerId, String position, int battingOrder, Long dhBatterPlayerId) {}

    public record StaffExport(Long playerId, String role) {}

    public record LeagueResultExport(String homeTeamName, String awayTeamName,
                                     int homeScore, int awayScore, LocalDate date) {}
}
