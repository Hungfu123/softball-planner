// backend/src/main/java/com/softball/domain/service/BaseRunningReplay.java
package com.softball.domain.service;

import com.softball.domain.model.AtBat;
import com.softball.domain.model.BaseRunningEvent;
import com.softball.domain.model.BaseRunningEventType;
import com.softball.domain.model.BaseState;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Pure Domain-Service: chronologischer Replay über AtBats + Stealing-Events.
 * Liefert (a) die Summe der Steal-Runs (Steal of Home + Kaskade) und (b) die
 * Zuordnung jedes erzielten Runs zu der Player-ID, die Home gekreuzt hat (R-Stat).
 *
 * Steals werden exakt attribuiert (die Cascade kennt den scorenden Runner).
 * Batting-Runs werden per Base-State-Diff (stateBefore → baseStateAfter) abgeleitet,
 * gedeckelt auf {@code AtBat.runsScored}; bei Mehrdeutigkeit scort der heimnächste
 * Runner zuerst (3B vor 2B vor 1B vor Batter).
 *
 * Einzige Quelle der Steal-Cascade-Logik — genutzt von GameScoringService (Score)
 * und BattingStatsCalculator (R).
 */
public class BaseRunningReplay {

    public ReplayResult replay(final List<AtBat> atBats, final List<BaseRunningEvent> steals) {
        final List<Object> timeline = new ArrayList<>(atBats.size() + steals.size());
        timeline.addAll(atBats);
        timeline.addAll(steals);
        timeline.sort(Comparator
            .comparing((Object o) -> o instanceof AtBat ab ? ab.getCreatedAt()
                                                           : ((BaseRunningEvent) o).getCreatedAt(),
                       Comparator.nullsFirst(Comparator.naturalOrder()))
            // Gleichstand: AtBat vor Steal (Steal wirkt auf den frisch gesetzten State).
            .thenComparing(o -> o instanceof AtBat ? 0 : 1));

        final Map<Long, Integer> runsByPlayer = new HashMap<>();
        int totalStealRuns = 0;
        BaseState state = BaseState.empty();
        Integer prevInning = null;

        for (final Object o : timeline) {
            if (o instanceof AtBat ab) {
                final int inning = ab.getInning() != null ? ab.getInning() : 1;
                // Inning-Reset: gestrandete Runner des Vor-Innings scoren nicht.
                final BaseState before = (prevInning != null && inning > prevInning)
                    ? BaseState.empty() : state;
                attributeBattingRuns(ab, before, runsByPlayer);
                state = ab.getBaseStateAfter() != null ? ab.getBaseStateAfter() : BaseState.empty();
                prevInning = inning;
            } else {
                final StealApplication app = applyStealingEvent(state, (BaseRunningEvent) o);
                state = app.state();
                totalStealRuns += app.runs();
                if (app.scorerId() != null) {
                    runsByPlayer.merge(app.scorerId(), 1, Integer::sum);
                }
            }
        }
        return new ReplayResult(totalStealRuns, runsByPlayer);
    }

    private void attributeBattingRuns(final AtBat ab, final BaseState before,
                                      final Map<Long, Integer> runsByPlayer) {
        final int scored = ab.getRunsScored() != null ? ab.getRunsScored() : 0;
        if (scored == 0) return;

        final BaseState after = ab.getBaseStateAfter() != null ? ab.getBaseStateAfter() : BaseState.empty();
        final List<Long> afterIds = new ArrayList<>();
        if (after.first() != null) afterIds.add(after.first());
        if (after.second() != null) afterIds.add(after.second());
        if (after.third() != null) afterIds.add(after.third());

        // Kandidaten in Heim-Nähe-Reihenfolge: 3B, 2B, 1B, dann Batter (falls erreicht).
        final List<Long> candidates = new ArrayList<>();
        if (before.third() != null) candidates.add(before.third());
        if (before.second() != null) candidates.add(before.second());
        if (before.first() != null) candidates.add(before.first());
        if (ab.getResult() != null && ab.getResult().reachedBase() && ab.getBatter() != null) {
            candidates.add(ab.getBatter().getId());
        }

        // "Verschwunden" = Kandidat steht nicht mehr auf einer Base → scored oder out.
        final List<Long> gone = new ArrayList<>();
        for (final Long id : candidates) {
            if (!afterIds.contains(id)) gone.add(id);
        }

        // Die ersten `scored` Verschwundenen (heimnächste zuerst) = Scorer.
        final int take = Math.min(scored, gone.size());
        for (int i = 0; i < take; i++) {
            runsByPlayer.merge(gone.get(i), 1, Integer::sum);
        }
    }

    /**
     * Wendet ein einzelnes Stealing-Event auf den Base-State an. Verschoben aus
     * GameScoringService (verbatim) + um {@code scorerId} erweitert.
     */
    public StealApplication applyStealingEvent(final BaseState state, final BaseRunningEvent e) {
        if (e.getRunner() == null) return new StealApplication(state, 0, null);
        final Long runnerId = e.getRunner().getId();
        if (e.getType() == BaseRunningEventType.STOLEN_BASE) {
            if (runnerId.equals(state.first())) {
                final Long on2B = state.second();
                final Long on3B = state.third();
                Long newThird = on3B;
                int runs = 0;
                Long scorer = null;
                if (on2B != null) {
                    if (on3B != null) { runs = 1; scorer = on3B; } // 3B-Runner scort Home
                    newThird = on2B;
                }
                return new StealApplication(new BaseState(null, runnerId, newThird), runs, scorer);
            } else if (runnerId.equals(state.second())) {
                final boolean scores = state.third() != null;
                return new StealApplication(new BaseState(state.first(), null, runnerId),
                    scores ? 1 : 0, scores ? state.third() : null);
            } else if (runnerId.equals(state.third())) {
                // Steal of Home — Runner scort.
                return new StealApplication(new BaseState(state.first(), state.second(), null), 1, runnerId);
            }
            return new StealApplication(state, 0, null);
        }
        if (e.getType() == BaseRunningEventType.CAUGHT_STEALING
                || e.getType() == BaseRunningEventType.OUT_ON_PLAY
                || e.getType() == BaseRunningEventType.PICKOFF) {
            if (runnerId.equals(state.first())) {
                return new StealApplication(new BaseState(null, state.second(), state.third()), 0, null);
            } else if (runnerId.equals(state.second())) {
                return new StealApplication(new BaseState(state.first(), null, state.third()), 0, null);
            } else if (runnerId.equals(state.third())) {
                return new StealApplication(new BaseState(state.first(), state.second(), null), 0, null);
            }
        }
        return new StealApplication(state, 0, null);
    }
}
