package com.softball.domain.service;

import com.softball.domain.model.Training;
import com.softball.domain.model.WhatsappPoll;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class PollDueEvaluator {

    /** Gekoppelt: senden am Vortag des Zieltrainings zur Umfrage-Zeit, sofern für dieses Training noch nicht gesendet. */
    public boolean isDue(final WhatsappPoll poll, final Training targetTraining, final LocalDateTime now) {
        if (poll == null || !poll.isEnabled() || poll.getWeekday() == null || poll.getTime() == null) return false;
        if (targetTraining == null || targetTraining.getDate() == null) return false;

        final LocalDate sendDate = targetTraining.getDate().minusDays(1);
        if (!now.toLocalDate().equals(sendDate)) return false;

        // Bereits für dieses Training gesendet → fertig. Dieser Guard (nicht die Uhrzeit)
        // ist es, der Doppelversand verhindert, und er erlaubt damit das Catch-up unten.
        if (poll.getLastSentTrainingId() != null && poll.getLastSentTrainingId().equals(targetTraining.getId())) return false;

        // Same-Day-Catch-up: fällig ab der Sendezeit, nicht nur exakt zur Minute. Vorher ging
        // eine Trainingsumfrage endgültig verloren, wenn der Scheduler diese eine Minute
        // verpasste (Deploy, Backend-Neustart, Sidecar nicht verbunden) — still und ohne
        // Hinweis, bis jemand den Ausfall bemerkt. Analog zu isDueOneOff.
        return !now.toLocalTime().isBefore(poll.getTime());
    }

    /** Einmalig (ONE_OFF und GAME_DAY): genau am sendDate zur Uhrzeit fällig, solange noch nie gesendet. */
    public boolean isDueOneOff(final WhatsappPoll poll, final LocalDateTime now) {
        if (poll == null || !poll.isEnabled() || poll.getSendDate() == null || poll.getTime() == null) return false;
        if (poll.getLastSentAt() != null) return false;
        if (!now.toLocalDate().equals(poll.getSendDate())) return false;
        // Same-Day-Catch-up: fällig ab der Sendezeit (nicht nur exakt zur Minute), damit eine
        // verpasste Scheduler-Minute (Deploy/Neustart) den einmaligen Versand nicht dauerhaft
        // verliert. lastSentAt-Guard oben stellt sicher, dass trotzdem nur 1× gesendet wird.
        return !now.toLocalTime().isBefore(poll.getTime());
    }
}
