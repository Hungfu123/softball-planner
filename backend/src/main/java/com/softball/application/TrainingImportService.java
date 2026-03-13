package com.softball.application;

import com.softball.adapter.dto.TrainingImportResponse;
import com.softball.domain.model.Player;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingAttendance;
import com.softball.domain.model.TrainingPeriod;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import com.softball.domain.port.out.TrainingPeriodRepository;
import com.softball.domain.port.out.TrainingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.StringReader;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TrainingImportService {

    private static final DateTimeFormatter CSV_DATE_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private final TrainingRepository trainingRepository;
    private final TrainingAttendanceRepository attendanceRepository;
    private final PlayerRepository playerRepository;
    private final TrainingPeriodRepository periodRepository;

    public TrainingImportService(final TrainingRepository trainingRepository,
                                  final TrainingAttendanceRepository attendanceRepository,
                                  final PlayerRepository playerRepository,
                                  final TrainingPeriodRepository periodRepository) {
        this.trainingRepository = trainingRepository;
        this.attendanceRepository = attendanceRepository;
        this.playerRepository = playerRepository;
        this.periodRepository = periodRepository;
    }

    @Transactional
    public TrainingImportResponse importCsv(final String csv, final String periodName) {
        final List<String> lines = parseCsvLines(csv);
        if (lines.size() < 2) {
            throw new IllegalArgumentException("CSV muss mindestens eine Kopfzeile und eine Datenzeile enthalten");
        }

        final String[] headers = lines.get(0).split(",", -1);
        final List<String> playerNames = new ArrayList<>();
        for (int i = 1; i < headers.length; i++) {
            playerNames.add(headers[i].trim());
        }

        final Map<String, Player> playersByName = playerRepository.findAll().stream()
            .collect(Collectors.toMap(
                p -> p.getName().trim().toLowerCase(),
                p -> p,
                (a, b) -> a
            ));

        final Set<String> notFoundPlayerNames = new HashSet<>();
        final List<Training> createdTrainings = new ArrayList<>();
        int skipped = 0;

        for (int row = 1; row < lines.size(); row++) {
            final String line = lines.get(row).trim();
            if (line.isEmpty()) {
                continue;
            }

            final String[] columns = line.split(",", -1);
            if (columns.length == 0 || columns[0].trim().isEmpty()) {
                continue;
            }

            final LocalDate date;
            try {
                date = LocalDate.parse(columns[0].trim(), CSV_DATE_FORMAT);
            } catch (final Exception e) {
                throw new IllegalArgumentException(
                    "Ung\u00fcltiges Datum in Zeile " + (row + 1) + ": '" + columns[0].trim() + "'. Erwartet: DD.MM.YYYY");
            }

            if (trainingRepository.existsByDate(date)) {
                skipped++;
                continue;
            }

            final boolean allEmpty = isAllAttendanceEmpty(columns, playerNames.size());

            Training training = new Training(date, null, null);
            training.setCancelled(allEmpty);
            training = trainingRepository.save(training);

            if (!allEmpty) {
                createAttendanceEntries(training, columns, playerNames, playersByName, notFoundPlayerNames);
            }

            createdTrainings.add(training);
        }

        if (periodName != null && !periodName.isBlank() && !createdTrainings.isEmpty()) {
            final LocalDate minDate = createdTrainings.stream()
                .map(Training::getDate).min(LocalDate::compareTo).orElseThrow();
            final LocalDate maxDate = createdTrainings.stream()
                .map(Training::getDate).max(LocalDate::compareTo).orElseThrow();

            final TrainingPeriod period = periodRepository.findByNameIgnoreCase(periodName.trim())
                .orElseGet(() -> periodRepository.save(new TrainingPeriod(periodName.trim(), minDate, maxDate)));

            for (final Training training : createdTrainings) {
                training.setPeriod(period);
            }
            trainingRepository.saveAll(createdTrainings);
        }

        return new TrainingImportResponse(
            createdTrainings.size(),
            skipped,
            notFoundPlayerNames.size()
        );
    }

    List<String> parseCsvLines(final String csv) {
        String cleaned = csv;
        if (cleaned.startsWith("\uFEFF")) {
            cleaned = cleaned.substring(1);
        }

        final List<String> lines = new ArrayList<>();
        try (final BufferedReader reader = new BufferedReader(new StringReader(cleaned))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.trim().isEmpty()) {
                    lines.add(line);
                }
            }
        } catch (final Exception e) {
            throw new IllegalArgumentException("CSV konnte nicht gelesen werden: " + e.getMessage());
        }
        return lines;
    }

    private boolean isAllAttendanceEmpty(final String[] columns, final int playerCount) {
        for (int i = 1; i <= playerCount && i < columns.length; i++) {
            final String value = columns[i].trim();
            if (!value.isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private void createAttendanceEntries(final Training training, final String[] columns,
                                          final List<String> playerNames,
                                          final Map<String, Player> playersByName,
                                          final Set<String> notFoundPlayerNames) {
        final List<TrainingAttendance> attendances = new ArrayList<>();
        for (int i = 0; i < playerNames.size(); i++) {
            final String playerName = playerNames.get(i);
            if (playerName.isEmpty()) {
                continue;
            }

            final Player player = playersByName.get(playerName.toLowerCase());
            if (player == null) {
                notFoundPlayerNames.add(playerName);
                continue;
            }

            final String value = (i + 1 < columns.length) ? columns[i + 1].trim() : "";
            final boolean present = "TRUE".equalsIgnoreCase(value);

            attendances.add(new TrainingAttendance(training, player, present));
        }
        attendanceRepository.saveAll(attendances);
        training.getAttendances().addAll(attendances);
    }
}
