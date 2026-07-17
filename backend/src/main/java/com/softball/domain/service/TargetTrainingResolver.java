package com.softball.domain.service;

import com.softball.domain.model.Training;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

public class TargetTrainingResolver {

    private static final int WINDOW_DAYS = 7;

    public Optional<Training> resolve(final List<Training> candidates, final LocalDate sentDate) {
        if (candidates == null || sentDate == null) return Optional.empty();
        final LocalDate limit = sentDate.plusDays(WINDOW_DAYS);
        return candidates.stream()
            .filter(t -> !t.isCancelled())
            .filter(t -> t.getDate() != null)
            .filter(t -> !t.getDate().isBefore(sentDate))
            .filter(t -> !t.getDate().isAfter(limit))
            .min(Comparator.comparing(Training::getDate));
    }
}
