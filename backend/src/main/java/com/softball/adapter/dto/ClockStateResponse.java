package com.softball.adapter.dto;

import com.softball.domain.service.GameClockCalculator.ClockState;
import com.softball.domain.service.GameDurationEstimator.DurationEstimate;

import java.util.Optional;

/**
 * Der berechnete Uhr-Zustand, wie er aus jedem Uhr-Endpunkt und den bestehenden
 * Lese-Endpunkten (Scoreboard, Sheet) zurückkommt — nie die rohen Zeitstempel. So rechnet
 * das Frontend nie mit der eigenen (moeglicherweise falsch gehenden) Geraeteuhr.
 *
 * <p>{@code durationEstimate} ist {@code null}, solange keine Schätzung möglich/sinnvoll ist
 * (siehe {@link GameDurationEstimator#estimate}) — nur die beiden Lese-Endpunkte (Scoreboard,
 * Sheet) füllen es, da nur dort Inning/Seite bekannt sind; die vier Uhr-Aktions-Endpunkte
 * (start/pause/resume/reset) liefern immer {@code null}, ihre Antwort wird vom Frontend ohnehin
 * verworfen (es reload'et danach den vollen Scoreboard-/Sheet-Zustand).
 */
public record ClockStateResponse(
    int elapsedSeconds,
    boolean running,
    boolean started,
    Integer limitMinutes,
    boolean overLimit,
    DurationEstimateResponse durationEstimate
) {
    public record DurationEstimateResponse(int totalMinutes, int remainingMinutes, int completedHalfInnings) {
        public static DurationEstimateResponse from(final DurationEstimate estimate) {
            return new DurationEstimateResponse(
                estimate.totalMinutes(), estimate.remainingMinutes(), estimate.completedHalfInnings());
        }
    }

    public static ClockStateResponse from(final ClockState state) {
        return from(state, Optional.empty());
    }

    public static ClockStateResponse from(final ClockState state, final Optional<DurationEstimate> estimate) {
        return new ClockStateResponse(
            state.elapsedSeconds(),
            state.running(),
            state.started(),
            state.limitMinutes(),
            state.overLimit(),
            estimate.map(DurationEstimateResponse::from).orElse(null)
        );
    }
}
