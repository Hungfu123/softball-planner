package com.softball.domain.service;

import com.softball.domain.model.Training;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Reine Diff-Logik: gleicht zukünftige Trainingstermine an einen Wochentag-Rhythmus an.
 * Betrachtet ausschließlich Termine mit date >= today — Vergangenheit bleibt unangetastet
 * (schützt Anwesenheits-/Trainingsplan-Historie).
 */
public class PeriodRhythmSync {

    public record SyncPlan(List<LocalDate> datesToCreate, List<Long> trainingIdsToDelete) {}

    public SyncPlan computeFuture(final List<Integer> weekdays, final LocalDate start, final LocalDate end,
                                   final LocalDate today, final List<Training> existing) {
        final Set<DayOfWeek> targetDays = weekdays.stream().map(DayOfWeek::of).collect(Collectors.toSet());

        final Set<LocalDate> existingFutureDates = existing.stream()
            .map(Training::getDate)
            .filter(d -> !d.isBefore(today))
            .collect(Collectors.toSet());

        final List<LocalDate> datesToCreate = new ArrayList<>();
        final LocalDate from = start.isBefore(today) ? today : start;
        for (LocalDate d = from; !d.isAfter(end); d = d.plusDays(1)) {
            if (targetDays.contains(d.getDayOfWeek()) && !existingFutureDates.contains(d)) {
                datesToCreate.add(d);
            }
        }

        final List<Long> trainingIdsToDelete = existing.stream()
            .filter(t -> !t.getDate().isBefore(today))
            .filter(t -> !targetDays.contains(t.getDate().getDayOfWeek()))
            .map(Training::getId)
            .collect(Collectors.toCollection(ArrayList::new));

        return new SyncPlan(datesToCreate, trainingIdsToDelete);
    }
}
