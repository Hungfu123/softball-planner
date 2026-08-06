package com.softball.domain.service;

import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenAtBat;
import com.softball.domain.model.SpielbogenStealingEvent;
import com.softball.domain.model.StealingEventType;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BogenScoreCalculator {

    /** Home Plate. Ein Runner, der hier ankommt, hat einen Run erzielt. */
    private static final int HOME_PLATE = 4;

    public Map<Integer, InningRuns> calculateInningRuns(final List<SpielbogenAtBat> atBats,
                                                        final List<SpielbogenStealingEvent> stealings) {
        Map<Integer, InningRuns> result = new HashMap<>();

        for (SpielbogenAtBat ab : atBats) {
            if (ab.getRunsScored() == null || ab.getRunsScored() == 0) continue;
            addRuns(result, ab.getInning(), ab.getSide(), ab.getRunsScored());
        }

        for (SpielbogenStealingEvent st : stealings) {
            if (!stealingScoresRun(st)) continue;
            addRuns(result, st.getInning(), st.getSide(), 1);
        }

        return result;
    }

    /**
     * Nur ein erfolgreiches Vorrücken auf die Home Plate erzielt einen Run.
     * CAUGHT_STEALING und OUT_ON_PLAY sind Outs, auch wenn toBase 4 ist.
     */
    private boolean stealingScoresRun(final SpielbogenStealingEvent st) {
        if (st.getToBase() == null || st.getToBase() != HOME_PLATE) return false;
        StealingEventType type = st.getType();
        return type == StealingEventType.STOLEN_BASE
            || type == StealingEventType.WILD_PITCH
            || type == StealingEventType.PASSED_BALL;
    }

    private void addRuns(final Map<Integer, InningRuns> target, final Integer inning,
                         final BogenSide side, final int runs) {
        InningRuns existing = target.computeIfAbsent(inning, k -> new InningRuns(0, 0));
        if (side == BogenSide.HOME) {
            existing.home += runs;
        } else {
            existing.away += runs;
        }
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
