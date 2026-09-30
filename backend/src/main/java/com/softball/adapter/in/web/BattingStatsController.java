package com.softball.adapter.in.web;

import com.softball.adapter.dto.OpponentBattingStatsResponse;
import com.softball.adapter.dto.PlayerBattingStatsResponse;
import com.softball.adapter.dto.SeasonPlayerStats;
import com.softball.adapter.dto.SeasonResponse;
import com.softball.application.BattingStatsService;
import com.softball.application.SeasonService;
import com.softball.application.StatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class BattingStatsController {

    private final BattingStatsService battingStatsService;
    private final StatsService statsService;
    private final SeasonService seasonService;

    public BattingStatsController(final BattingStatsService battingStatsService,
                                   final StatsService statsService,
                                   final SeasonService seasonService) {
        this.battingStatsService = battingStatsService;
        this.statsService = statsService;
        this.seasonService = seasonService;
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

    @GetMapping("/api/stats/opponents/{teamId}/batting")
    public List<PlayerBattingStatsResponse> getOpponentBattingStats(@PathVariable final Long teamId) {
        return battingStatsService.getOpponentBattingStats(teamId);
    }
}
