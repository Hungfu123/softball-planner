package com.softball.adapter.dto;

import com.softball.domain.model.DayForecast;

public record WeatherResponse(
    int tempMin,
    int tempMax,
    int wmoCode,
    int precipitationProbabilityPct
) {
    public static WeatherResponse from(final DayForecast f) {
        return new WeatherResponse(f.tempMin(), f.tempMax(), f.wmoCode(), f.precipitationProbabilityPct());
    }
}
