package com.softball.adapter.dto;

import com.softball.domain.service.GameClockCalculator.ClockState;

/**
 * Der berechnete Uhr-Zustand, wie er aus jedem Uhr-Endpunkt und den bestehenden
 * Lese-Endpunkten (Scoreboard, Sheet) zurückkommt — nie die rohen Zeitstempel. So rechnet
 * das Frontend nie mit der eigenen (moeglicherweise falsch gehenden) Geraeteuhr.
 */
public record ClockStateResponse(
    int elapsedSeconds,
    boolean running,
    boolean started,
    Integer limitMinutes,
    boolean overLimit
) {
    public static ClockStateResponse from(final ClockState state) {
        return new ClockStateResponse(
            state.elapsedSeconds(),
            state.running(),
            state.started(),
            state.limitMinutes(),
            state.overLimit()
        );
    }
}
