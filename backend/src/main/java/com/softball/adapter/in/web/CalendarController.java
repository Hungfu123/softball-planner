package com.softball.adapter.in.web;

import com.softball.adapter.dto.GameDayResponse;
import com.softball.adapter.dto.TrainingResponse;
import com.softball.application.GameDayService;
import com.softball.application.SeasonService;
import com.softball.application.TrainingService;
import com.softball.domain.model.Season;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * iCalendar-Export (.ics) aller Spieltage (+ optional Trainings) über alle Saisons.
 * Abonnierbar/importierbar in jeden Kalender. Reine Serialisierung (Adapter-Layer).
 */
@RestController
public class CalendarController {

    private static final DateTimeFormatter DATE = DateTimeFormatter.BASIC_ISO_DATE; // yyyyMMdd
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");

    private final GameDayService gameDayService;
    private final SeasonService seasonService;
    private final TrainingService trainingService;

    public CalendarController(final GameDayService gameDayService,
                              final SeasonService seasonService,
                              final TrainingService trainingService) {
        this.gameDayService = gameDayService;
        this.seasonService = seasonService;
        this.trainingService = trainingService;
    }

    @GetMapping(value = "/api/calendar.ics", produces = "text/calendar;charset=UTF-8")
    public ResponseEntity<String> calendar(
            @RequestParam(required = false, defaultValue = "false") final boolean trainings) {

        final Map<Long, String> seasonNames = seasonService.findAll().stream()
            .collect(Collectors.toMap(Season::getId, Season::getName, (a, b) -> a));

        final String stamp = ZonedDateTime.now(ZoneOffset.UTC).format(STAMP);
        final StringBuilder ics = new StringBuilder();
        ics.append("BEGIN:VCALENDAR\r\n")
           .append("VERSION:2.0\r\n")
           .append("PRODID:-//Dead Sox//Softball Planner//DE\r\n")
           .append("CALSCALE:GREGORIAN\r\n")
           .append("X-WR-CALNAME:Dead Sox\r\n");

        for (final GameDayResponse gd : gameDayService.findAllAsDto()) {
            if (gd.date() == null) continue;
            final String season = seasonNames.getOrDefault(gd.seasonId(), "");
            final String opponents = gd.games().stream()
                .map(g -> g.opponentTeam() != null ? g.opponentTeam().name() : null)
                .filter(n -> n != null && !n.isBlank())
                .distinct()
                .collect(Collectors.joining(", "));
            final String title = (season.isBlank() ? "" : season + " · ")
                + (opponents.isBlank() ? (gd.label() != null ? gd.label() : "Spieltag") : "vs " + opponents);
            appendEvent(ics, "gameday-" + gd.id(), gd.date(), title, gd.location(), stamp);
        }

        if (trainings) {
            for (final TrainingResponse t : trainingService.findAll(null)) {
                if (t.date() == null || t.cancelled()) continue;
                final String title = "Training" + (t.time() != null && !t.time().isBlank() ? " " + t.time() : "");
                appendEvent(ics, "training-" + t.id(), t.date(), title, t.location(), stamp);
            }
        }

        ics.append("END:VCALENDAR\r\n");

        final HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/calendar;charset=UTF-8"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"deadsox.ics\"");
        return ResponseEntity.ok().headers(headers).body(ics.toString());
    }

    /** All-Day-VEVENT (DTSTART/DTEND als DATE, DTEND = Folgetag). */
    private void appendEvent(final StringBuilder ics, final String uid, final LocalDate date,
                             final String summary, final String location, final String stamp) {
        ics.append("BEGIN:VEVENT\r\n")
           .append("UID:").append(uid).append("@softball-planner\r\n")
           .append("DTSTAMP:").append(stamp).append("\r\n")
           .append("DTSTART;VALUE=DATE:").append(date.format(DATE)).append("\r\n")
           .append("DTEND;VALUE=DATE:").append(date.plusDays(1).format(DATE)).append("\r\n")
           .append("SUMMARY:").append(escape(summary)).append("\r\n");
        if (location != null && !location.isBlank()) {
            ics.append("LOCATION:").append(escape(location)).append("\r\n");
        }
        ics.append("END:VEVENT\r\n");
    }

    /** ICS-Text-Escaping: Backslash, Komma, Semikolon, Zeilenumbruch. */
    private String escape(final String s) {
        return s == null ? "" : s
            .replace("\\", "\\\\")
            .replace(",", "\\,")
            .replace(";", "\\;")
            .replace("\n", "\\n");
    }
}
