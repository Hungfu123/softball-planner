package com.softball.adapter.in.web;

import com.softball.adapter.dto.PlayerBattingStatsResponse;
import com.softball.application.BattingStatsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class BattingStatsController {

    private final BattingStatsService statsService;

    public BattingStatsController(final BattingStatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping("/api/games/{gameId}/batting-stats")
    public List<PlayerBattingStatsResponse> getGameStats(@PathVariable final Long gameId) {
        return statsService.getGameStats(gameId);
    }

    @GetMapping("/api/gamedays/{gameDayId}/batting-stats")
    public List<PlayerBattingStatsResponse> getGameDayStats(@PathVariable final Long gameDayId) {
        return statsService.getGameDayStats(gameDayId);
    }

    @GetMapping("/api/seasons/{seasonId}/batting-stats")
    public List<PlayerBattingStatsResponse> getSeasonStats(@PathVariable final Long seasonId) {
        return statsService.getSeasonStats(seasonId);
    }
}
