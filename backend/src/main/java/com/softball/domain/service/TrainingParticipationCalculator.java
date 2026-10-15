package com.softball.domain.service;

import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingAttendance;

import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Trainingsbeteiligung als Quote statt als Zaehler.
 *
 * <p>Der rohe Zaehler benachteiligt zwei Gruppen systematisch: wer spaeter dazukam, hat
 * weniger Termine gehabt, und wer zu einem Trainingstyp gar nicht eingeladen wird, kann
 * dort nicht erscheinen. Gezaehlt wird deshalb <em>besucht geteilt durch stattgefunden
 * seit dem ersten Auftauchen</em> — wer im Mai dazukam, hat den April nicht versaeumt.
 *
 * <p>Welche Trainings "stattgefunden" haben, entscheidet der Aufrufer: er reicht die
 * bereits gefilterte Liste herein (abgesagte raus, P/C-Tag raus). Zaehler und Nenner
 * stammen damit zwingend aus derselben Menge.
 *
 * <p>Gleiche Regel wie im Einsatz-Profil, siehe {@link PlayerUsageCalculator}.
 */
public final class TrainingParticipationCalculator {

    /**
     * Kleinster Nenner, mit dem gerechnet wird.
     *
     * <p>Ohne Untergrenze bekommt, wer zwei Wochen vor dem Spieltag neu dazukommt und
     * beide Male da ist, die Quote 1.0 und steht vor jedem Stammspieler. Zwei von zwei
     * sieht fuer die Quote aus wie fuenfzig von fuenfzig. Mit der Untergrenze sind es
     * 2/3 — nicht bestraft, aber auch nicht automatisch vorn. Ab dem dritten
     * stattgefundenen Training aendert sie nichts mehr.
     */
    static final int MIN_DENOMINATOR = 3;

    private TrainingParticipationCalculator() {}

    /**
     * Beteiligung eines Spielers: besucht, davon moeglich, und die Quote daraus.
     *
     * @param attended besuchte Trainings
     * @param held     stattgefundene Trainings seit seinem ersten Auftauchen (ungefloort,
     *                 damit die UI "19 von 43" schreiben kann)
     * @param rate     besucht / max(held, {@link #MIN_DENOMINATOR})
     */
    public record Participation(long attended, long held, double rate) {}

    /**
     * @param heldTrainings Trainings, die zaehlen sollen — bereits gefiltert.
     * @param attendances   Anwesenheiten zu genau diesen Trainings.
     * @return Quote je Spieler zwischen 0.0 und 1.0. Wer nie da war, fehlt in der Map.
     */
    public static Map<Long, Double> rates(final Collection<Training> heldTrainings,
                                          final Collection<TrainingAttendance> attendances) {
        final Map<Long, Double> rates = new HashMap<>();
        participation(heldTrainings, attendances).forEach((id, p) -> rates.put(id, p.rate()));
        return rates;
    }

    /**
     * Wie {@link #rates}, aber mit den Zahlen dahinter — die UI soll "19 von 43" zeigen
     * koennen und nicht nur eine nackte Prozentzahl.
     */
    public static Map<Long, Participation> participation(final Collection<Training> heldTrainings,
                                                          final Collection<TrainingAttendance> attendances) {
        if (heldTrainings == null || heldTrainings.isEmpty() || attendances == null) {
            return Map.of();
        }

        final Map<Long, LocalDate> dateByTrainingId = new HashMap<>();
        for (final Training t : heldTrainings) {
            if (t.getId() != null && t.getDate() != null) {
                dateByTrainingId.put(t.getId(), t.getDate());
            }
        }
        final List<LocalDate> heldDates = dateByTrainingId.values().stream().sorted().toList();

        // Erstes Auftauchen = frueheste Anwesenheit. Eine blosse Attendance-Zeile reicht
        // nicht: sie entsteht auch durch ein "Nein" in der WhatsApp-Umfrage, und ein Nein
        // soll den Nenner nicht rueckwirkend bis zum Saisonstart aufziehen.
        final Map<Long, LocalDate> firstSeenByPlayer = new HashMap<>();
        final Map<Long, Set<Long>> attendedTrainingIdsByPlayer = new HashMap<>();

        for (final TrainingAttendance a : attendances) {
            if (!a.isPresent() || a.getPlayer() == null || a.getTraining() == null) continue;
            final Long playerId = a.getPlayer().getId();
            final LocalDate date = dateByTrainingId.get(a.getTraining().getId());
            if (playerId == null || date == null) continue;

            attendedTrainingIdsByPlayer
                .computeIfAbsent(playerId, k -> new HashSet<>())
                .add(a.getTraining().getId());
            firstSeenByPlayer.merge(playerId, date, (oldDate, newDate) ->
                newDate.isBefore(oldDate) ? newDate : oldDate);
        }

        final Map<Long, Participation> result = new HashMap<>();
        for (final Map.Entry<Long, Set<Long>> entry : attendedTrainingIdsByPlayer.entrySet()) {
            final LocalDate firstSeen = firstSeenByPlayer.get(entry.getKey());
            final long held = heldDates.stream().filter(d -> !d.isBefore(firstSeen)).count();
            if (held == 0) continue;
            final long attended = entry.getValue().size();
            result.put(entry.getKey(),
                new Participation(attended, held, (double) attended / Math.max(held, MIN_DENOMINATOR)));
        }
        return result;
    }
}
