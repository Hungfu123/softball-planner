package com.softball.adapter.dto;

import com.softball.domain.model.DayForecast;
import com.softball.domain.model.HourSlot;

import java.util.List;

public record WeatherResponse(
    int tempMin,
    int tempMax,
    int wmoCode,
    int precipitationProbabilityPct,
    List<HourSlotResponse> hours
) {
    public static WeatherResponse from(final DayForecast f) {
        return new WeatherResponse(
            f.tempMin(), f.tempMax(), f.wmoCode(), f.precipitationProbabilityPct(),
            f.hours().stream().map(HourSlotResponse::from).toList());
    }

    public record HourSlotResponse(int hour, int temp, int wmoCode, int precipitationProbabilityPct) {
        public static HourSlotResponse from(final HourSlot h) {
            return new HourSlotResponse(h.hour(), h.temp(), h.wmoCode(), h.precipitationProbabilityPct());
        }
    }
}
