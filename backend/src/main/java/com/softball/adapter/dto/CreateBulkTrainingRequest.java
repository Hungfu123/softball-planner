package com.softball.adapter.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record CreateBulkTrainingRequest(
    @NotEmpty(message = "Wochentage dürfen nicht leer sein")
    List<Integer> weekdays,

    @NotNull(message = "Startdatum ist erforderlich")
    LocalDate startDate,

    @NotNull(message = "Enddatum ist erforderlich")
    LocalDate endDate,

    String time,

    @NotNull(message = "Uhrzeiten je Wochentag sind erforderlich")
    Map<Integer, String> weekdayTimes,

    String location,

    /** Ort je ISO-Wochentag; was fehlt, erbt `location`. */
    Map<Integer, String> weekdayLocations,

    String periodName,

    String type,

    Integer cycleWeeks,

    List<Integer> activeWeeksInCycle,

    /**
     * ISO-Wochentage, an denen nur Pitcher und Catcher eingeladen sind. Leer = alle
     * Termine stehen dem ganzen Kader offen und zaehlen in die Trainingsbeteiligung.
     */
    List<Integer> pcOnlyWeekdays
) {}
