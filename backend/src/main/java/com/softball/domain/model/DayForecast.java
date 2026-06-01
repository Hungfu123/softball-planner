package com.softball.domain.model;

import java.util.List;

/**
 * Wetter-Zusammenfassung für das Tagesfenster 8–18 Uhr eines Spieltags.
 * tempMin/tempMax in °C (gerundet), wmoCode = WMO-Weather-Code,
 * precipitationProbabilityPct = max. Regenwahrscheinlichkeit im Fenster,
 * hours = stündlicher Tagesablauf (für Detail-Ansicht).
 */
public record DayForecast(
    int tempMin,
    int tempMax,
    int wmoCode,
    int precipitationProbabilityPct,
    List<HourSlot> hours
) {}
