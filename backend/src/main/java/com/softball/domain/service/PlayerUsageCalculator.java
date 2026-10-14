package com.softball.domain.service;

import com.softball.domain.model.GameDay;
import com.softball.domain.model.PlayerUsage;
import com.softball.domain.model.Training;
import com.softball.domain.model.UsageScope;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

/**
 * Rechnet Verfuegbarkeit, Einsatz und Schlagplatz eines Spielers zusammen.
 *
 * Gezaehlt wird nur, was schon stattgefunden hat: ein Spieltag in zwei Wochen sagt
 * nichts ueber Verlaesslichkeit, wuerde die Quote aber verwaessern. Abgesagte
 * Trainings zaehlen aus demselben Grund nicht — da konnte niemand hingehen.
 *
 * Und gezaehlt wird erst ab dem Tag, an dem die Person zum ersten Mal auftaucht:
 * wer im Mai dazugestossen ist, hat die Spieltage im April nicht versaeumt.
 */
public class PlayerUsageCalculator {

    public PlayerUsage calculate(final Collection<GameDay> gameDays,
                                 final Set<Long> availableGameDayIds,
                                 final Set<Long> playedGameDayIds,
                                 final List<Integer> battingOrders,
                                 final Collection<Training> trainings,
                                 final Set<Long> attendedTrainingIds,
                                 final LocalDate today) {
        return calculate(gameDays, availableGameDayIds, playedGameDayIds, battingOrders,
            trainings, attendedTrainingIds, today, UsageScope.all());
    }

    /**
     * @param scope Jahr oder Saison; der Filter der Profilseite muss auch hier greifen, sonst
     *              steht eine Alle-Jahre-Quote neben Schlagzahlen einer einzelnen Saison.
     */
    public PlayerUsage calculate(final Collection<GameDay> gameDays,
                                 final Set<Long> availableGameDayIds,
                                 final Set<Long> playedGameDayIds,
                                 final List<Integer> battingOrders,
                                 final Collection<Training> trainings,
                                 final Set<Long> attendedTrainingIds,
                                 final LocalDate today,
                                 final UsageScope scope) {
        final Integer year = scope == null ? null : scope.year();
        final Long seasonId = scope == null ? null : scope.seasonId();
        final LocalDate firstSeen = firstSeen(gameDays, availableGameDayIds, playedGameDayIds,
            trainings, attendedTrainingIds);

        final List<GameDay> past = gameDays.stream()
            .filter(gd -> gd.getDate() != null && !gd.getDate().isAfter(today))
            .filter(gd -> firstSeen == null || !gd.getDate().isBefore(firstSeen))
            .filter(gd -> year == null || gd.getDate().getYear() == year)
            .filter(gd -> seasonId == null
                || (gd.getSeason() != null && seasonId.equals(gd.getSeason().getId())))
            .toList();

        int available = 0;
        int played = 0;
        for (final GameDay gd : past) {
            if (availableGameDayIds.contains(gd.getId())) available++;
            if (playedGameDayIds.contains(gd.getId())) played++;
        }

        // Saison-Zuschnitt laesst Trainings aussen vor: sie gehoeren zu keiner Saison.
        final List<Training> heldTrainings = seasonId != null ? List.<Training>of() : trainings.stream()
            .filter(t -> !t.isCancelled())
            .filter(t -> t.getDate() != null && !t.getDate().isAfter(today))
            .filter(t -> firstSeen == null || !t.getDate().isBefore(firstSeen))
            .filter(t -> year == null || t.getDate().getYear() == year)
            .toList();
        final long attended = heldTrainings.stream()
            .filter(t -> attendedTrainingIds.contains(t.getId()))
            .count();

        final Map<Integer, Integer> orderCounts = new TreeMap<>();
        for (final Integer order : battingOrders) {
            if (order == null) continue;
            orderCounts.merge(order, 1, Integer::sum);
        }
        final Double averageOrder = orderCounts.isEmpty() ? null : weightedAverage(orderCounts);

        return new PlayerUsage(
            past.size(),
            available,
            played,
            heldTrainings.size(),
            (int) attended,
            averageOrder,
            // Sortiert heraus, damit die Verteilung in der API schon in Schlagreihenfolge steht.
            Collections.unmodifiableMap(orderCounts)
        );
    }

    /**
     * Der erste Tag, an dem die Person ueberhaupt vorkommt — als Zusage, im Lineup
     * oder im Training. Davor gab es sie fuer dieses Team nicht.
     */
    private LocalDate firstSeen(final Collection<GameDay> gameDays,
                                final Set<Long> availableGameDayIds,
                                final Set<Long> playedGameDayIds,
                                final Collection<Training> trainings,
                                final Set<Long> attendedTrainingIds) {
        final LocalDate firstGameDay = gameDays.stream()
            .filter(gd -> gd.getDate() != null)
            .filter(gd -> availableGameDayIds.contains(gd.getId()) || playedGameDayIds.contains(gd.getId()))
            .map(GameDay::getDate)
            .min(LocalDate::compareTo).orElse(null);
        final LocalDate firstTraining = trainings.stream()
            .filter(t -> t.getDate() != null && attendedTrainingIds.contains(t.getId()))
            .map(Training::getDate)
            .min(LocalDate::compareTo).orElse(null);

        if (firstGameDay == null) return firstTraining;
        if (firstTraining == null) return firstGameDay;
        return firstGameDay.isBefore(firstTraining) ? firstGameDay : firstTraining;
    }

    private double weightedAverage(final Map<Integer, Integer> counts) {
        int sum = 0;
        int total = 0;
        for (final Map.Entry<Integer, Integer> e : counts.entrySet()) {
            sum += e.getKey() * e.getValue();
            total += e.getValue();
        }
        return Math.round((double) sum / total * 10.0) / 10.0;
    }
}
