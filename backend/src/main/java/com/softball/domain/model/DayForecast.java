package com.softball.domain.model;

/**
 * Wetter-Zusammenfassung für das Tagesfenster 8–18 Uhr eines Spieltags.
 * tempMin/tempMax in °C (gerundet), wmoCode = WMO-Weather-Code,
 * precipitationProbabilityPct = max. Regenwahrscheinlichkeit im Fenster.
 */
public record DayForecast(
    int tempMin,
    int tempMax,
    int wmoCode,
    int precipitationProbabilityPct
) {}
