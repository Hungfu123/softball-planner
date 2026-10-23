package com.softball.adapter.in.web;

import org.springframework.security.access.prepost.PreAuthorize;
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

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * iCalendar-Export (.ics) aller Spieltage (+ optional Trainings) über alle Saisons.
 * Abonnierbar/importierbar in jeden Kalender. Reine Serialisierung (Adapter-Layer).
 * Öffentlich (permitAll in SecurityConfig) damit Kalender-Apps abonnieren können.
 */
@PreAuthorize("permitAll()")
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
        appendLine(ics, "BEGIN:VCALENDAR");
        appendLine(ics, "VERSION:2.0");
        appendLine(ics, "PRODID:-//Dead Sox//Softball Planner//DE");
        appendLine(ics, "CALSCALE:GREGORIAN");
        appendLine(ics, "X-WR-CALNAME:Dead Sox");

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

        appendLine(ics, "END:VCALENDAR");

        final HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/calendar;charset=UTF-8"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"deadsox.ics\"");
        return ResponseEntity.ok().headers(headers).body(ics.toString());
    }

    /** All-Day-VEVENT (DTSTART/DTEND als DATE, DTEND = Folgetag). */
    private void appendEvent(final StringBuilder ics, final String uid, final LocalDate date,
                             final String summary, final String location, final String stamp) {
        appendLine(ics, "BEGIN:VEVENT");
        appendLine(ics, "UID:" + uid + "@softball-planner");
        appendLine(ics, "DTSTAMP:" + stamp);
        appendLine(ics, "DTSTART;VALUE=DATE:" + date.format(DATE));
        appendLine(ics, "DTEND;VALUE=DATE:" + date.plusDays(1).format(DATE));
        appendLine(ics, "SUMMARY:" + escape(summary));
        if (location != null && !location.isBlank()) {
            appendLine(ics, "LOCATION:" + escape(location));
        }
        appendLine(ics, "END:VEVENT");
    }

    /**
     * Schreibt eine Content-Line mit CRLF und RFC-5545-Zeilen-Folding (max 75 Oktette,
     * Fortsetzung mit führendem Space). UTF-8-Multibyte-sicher (Umlaute).
     */
    private void appendLine(final StringBuilder ics, final String content) {
        int lineBytes = 0;
        for (int i = 0; i < content.length(); i++) {
            final char c = content.charAt(i);
            final int cb = String.valueOf(c).getBytes(StandardCharsets.UTF_8).length;
            if (lineBytes + cb > 73) { // konservativ < 75 inkl. Fortsetzungs-Space
                ics.append("\r\n ");
                lineBytes = 1; // führender Space der Fortsetzungszeile
            }
            ics.append(c);
            lineBytes += cb;
        }
        ics.append("\r\n");
    }

    /** ICS-Text-Escaping: Backslash, Komma, Semikolon, Zeilenumbruch; CR entfernt. */
    private String escape(final String s) {
        return s == null ? "" : s
            .replace("\\", "\\\\")
            .replace(",", "\\,")
            .replace(";", "\\;")
            .replace("\r", "")
            .replace("\n", "\\n");
    }
}
