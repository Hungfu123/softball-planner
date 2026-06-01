package com.softball.application;

import com.softball.domain.model.Award;
import com.softball.domain.model.BattingStats;
import com.softball.domain.service.GamedayAwardCalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AwardService {

    private static final Logger log = LoggerFactory.getLogger(AwardService.class);

    private final BattingStatsService battingStatsService;
    private final GamedayAwardCalculator calculator = new GamedayAwardCalculator();

    public AwardService(final BattingStatsService battingStatsService) {
        this.battingStatsService = battingStatsService;
    }

    public List<Award> getGameDayAwards(final Long gameDayId) {
        final List<BattingStats> stats = battingStatsService.getGameDayBattingStats(gameDayId);
        final List<Award> awards = calculator.calculate(stats);
        log.info("Awards für GameDay {}: {} vergeben", gameDayId, awards.size());
        return awards;
    }

    public List<Award> getSeasonAwards(final Long seasonId) {
        return calculator.calculate(battingStatsService.getSeasonBattingStats(seasonId));
    }

    public List<Award> getYearAwards(final int year) {
        return calculator.calculate(battingStatsService.getYearBattingStats(year));
    }

    public List<Award> getAllTimeAwards() {
        return calculator.calculate(battingStatsService.getAllTimeBattingStats());
    }
}
