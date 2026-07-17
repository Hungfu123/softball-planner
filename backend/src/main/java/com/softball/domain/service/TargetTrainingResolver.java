package com.softball.domain.service;

import com.softball.domain.model.Training;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Löst den Versandzeitpunkt einer Trainings-Umfrage auf das gemeinte Training auf.
 * Der Poll fragt "Wer kommt morgen zum Training?" und wird am Vortag verschickt —
 * daher zählt nur ein Training kurz nach dem Versand (Fenster {@value #WINDOW_HOURS}h),
 * nicht irgendeines in der Folgewoche. Genommen wird das nächstgelegene nicht-abgesagte
 * Training, dessen Startzeit im Fenster [sentAt, sentAt+48h] liegt.
 */
public class TargetTrainingResolver {

    private static final int WINDOW_HOURS = 48;
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("H:mm");

    public Optional<Training> resolve(final List<Training> candidates, final LocalDateTime sentAt) {
        if (candidates == null || sentAt == null) return Optional.empty();
        final LocalDateTime limit = sentAt.plusHours(WINDOW_HOURS);
        return candidates.stream()
            .filter(t -> !t.isCancelled())
            .filter(t -> t.getDate() != null)
            .filter(t -> {
                final LocalDateTime start = start(t);
                return !start.isBefore(sentAt) && !start.isAfter(limit);
            })
            .min(Comparator.comparing(this::start));
    }

    /** Trainings-Startzeitpunkt; bei unparsebarer/leerer Uhrzeit defensiv auf Tagesbeginn. */
    private LocalDateTime start(final Training t) {
        final LocalTime time = parseTime(t.getTime());
        return time != null ? t.getDate().atTime(time) : t.getDate().atStartOfDay();
    }

    private LocalTime parseTime(final String time) {
        if (time == null || time.isBlank()) return null;
        try {
            return LocalTime.parse(time.trim(), HH_MM);
        } catch (final Exception e) {
            return null;
        }
    }
}
