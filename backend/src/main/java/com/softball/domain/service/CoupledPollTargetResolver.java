package com.softball.domain.service;

import com.softball.domain.model.Training;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/** Findet das nächste gültige Training an einem Wochentag (für gekoppelte WhatsApp-Umfragen). */
public class CoupledPollTargetResolver {

    public Optional<Training> resolve(final List<Training> candidates, final DayOfWeek weekday,
                                      final List<LocalDate> skipDates, final LocalDate today) {
        if (candidates == null || weekday == null || today == null) return Optional.empty();
        final List<LocalDate> skips = skipDates != null ? skipDates : List.of();
        return candidates.stream()
            .filter(t -> t.getDate() != null)
            .filter(t -> !t.isCancelled())
            .filter(t -> t.getDate().getDayOfWeek() == weekday)
            .filter(t -> !t.getDate().isBefore(today))
            .filter(t -> !skips.contains(t.getDate()))
            .min(Comparator.comparing(Training::getDate));
    }
}
