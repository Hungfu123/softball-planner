package com.softball.domain.service;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenAtBat;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BogenScoreCalculator {

    public Map<Integer, InningRuns> calculateInningRuns(final List<SpielbogenAtBat> atBats) {
        Map<Integer, InningRuns> result = new HashMap<>();
        for (SpielbogenAtBat ab : atBats) {
            if (ab.getRunsScored() == null || ab.getRunsScored() == 0) continue;
            InningRuns existing = result.computeIfAbsent(ab.getInning(), k -> new InningRuns(0, 0));
            if (ab.getSide() == BogenSide.HOME) {
                existing.home += ab.getRunsScored();
            } else {
                existing.away += ab.getRunsScored();
            }
        }
        return result;
    }

    public static class InningRuns {
        public int home;
        public int away;

        public InningRuns(int home, int away) {
            this.home = home;
            this.away = away;
        }

        public int getHome() { return home; }
        public int getAway() { return away; }
    }
}
