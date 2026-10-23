package com.softball.adapter.in.web;

import org.springframework.security.access.prepost.PreAuthorize;
import com.softball.adapter.dto.BattingSlotStatsResponse;
import com.softball.adapter.dto.OpponentBattingStatsResponse;
import com.softball.adapter.dto.PlayerBattingStatsResponse;
import com.softball.adapter.dto.SeasonPlayerStats;
import com.softball.adapter.dto.SeasonResponse;
import com.softball.adapter.dto.TeamGameLogResponse;
import com.softball.application.BattingStatsService;
import com.softball.application.GameAnalysisService;
import com.softball.application.SeasonService;
import com.softball.application.StatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@PreAuthorize("hasRole('ADMIN')")
@RestController
public class BattingStatsController {

    private final BattingStatsService battingStatsService;
    private final StatsService statsService;
    private final SeasonService seasonService;
    private final GameAnalysisService gameAnalysisService;

    public BattingStatsController(final BattingStatsService battingStatsService,
                                   final StatsService statsService,
                                   final SeasonService seasonService,
                                   final GameAnalysisService gameAnalysisService) {
        this.battingStatsService = battingStatsService;
        this.statsService = statsService;
        this.seasonService = seasonService;
        this.gameAnalysisService = gameAnalysisService;
    }

    /** Team-Offensiv-Verlauf pro gespieltem Spiel: Hits, Walks, On-Base, LOB, Inning-Zahlen. */
    @GetMapping("/api/stats/game-logs")
    public List<TeamGameLogResponse> getTeamGameLogs() {
        return gameAnalysisService.getTeamGameLogs();
    }

    /** Was die Batting-Plätze 1..N produziert haben — ohne gameIds über alle Spiele, sonst nur über die Auswahl. */
    @GetMapping("/api/stats/batting-slots")
    public List<BattingSlotStatsResponse> getBattingSlots(@RequestParam(value = "gameIds", required = false) final List<Long> gameIds) {
        return gameAnalysisService.getBattingSlots(gameIds);
    }

    @GetMapping("/api/games/{gameId}/batting-stats")
    public List<PlayerBattingStatsResponse> getGameStats(@PathVariable final Long gameId) {
        return battingStatsService.getGameStats(gameId);
    }

    @GetMapping("/api/gamedays/{gameDayId}/batting-stats")
    public List<PlayerBattingStatsResponse> getGameDayStats(@PathVariable final Long gameDayId) {
        return battingStatsService.getGameDayStats(gameDayId);
    }

    @GetMapping("/api/seasons/{seasonId}/batting-stats")
    public List<PlayerBattingStatsResponse> getSeasonStats(@PathVariable final Long seasonId) {
        return battingStatsService.getSeasonStats(seasonId);
    }

    @GetMapping("/api/years/{year}/batting-stats")
    public List<PlayerBattingStatsResponse> getYearBattingStats(@PathVariable final int year) {
        return battingStatsService.getYearStats(year);
    }

    @GetMapping("/api/years/{year}/stats")
    public List<SeasonPlayerStats> getYearStats(@PathVariable final int year) {
        return statsService.getYearStats(year);
    }

    @GetMapping("/api/years/{year}/seasons")
    public List<SeasonResponse> getYearSeasons(@PathVariable final int year) {
        return seasonService.getSeasonsByYear(year).stream().map(SeasonResponse::from).toList();
    }

    @GetMapping("/api/stats/all-time/batting")
    public List<PlayerBattingStatsResponse> getAllTimeBattingStats() {
        return battingStatsService.getAllTimeStats();
    }

    @GetMapping("/api/stats/all-time/games")
    public List<SeasonPlayerStats> getAllTimeStats() {
        return statsService.getAllTimeStats();
    }

    @GetMapping("/api/stats/opponents")
    public List<OpponentBattingStatsResponse> getOpponentBattingOverview() {
        return battingStatsService.getOpponentBattingOverview();
    }

    @GetMapping("/api/stats/opponents/batting")
    public List<PlayerBattingStatsResponse> getOpponentBattingStats(@RequestParam("team") final String teamName) {
        return battingStatsService.getOpponentBattingStats(teamName);
    }
}
