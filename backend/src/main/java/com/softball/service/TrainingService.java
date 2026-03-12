package com.softball.service;

import com.softball.dto.TrainingAttendanceResponse;
import com.softball.dto.TrainingPeriodResponse;
import com.softball.dto.TrainingResponse;
import com.softball.dto.TrainingStatsResponse;
import com.softball.entity.Player;
import com.softball.entity.Training;
import com.softball.entity.TrainingAttendance;
import com.softball.entity.TrainingPeriod;
import com.softball.exception.ResourceNotFoundException;
import com.softball.repository.PlayerRepository;
import com.softball.repository.TrainingAttendanceRepository;
import com.softball.repository.TrainingPeriodRepository;
import com.softball.repository.TrainingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.softball.dto.SetAttendanceRequest;

import com.softball.dto.TrainingImportResponse;

import java.io.BufferedReader;
import java.io.StringReader;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TrainingService {

    private final TrainingRepository trainingRepository;
    private final TrainingAttendanceRepository attendanceRepository;
    private final PlayerRepository playerRepository;
    private final TrainingPeriodRepository periodRepository;

    public TrainingService(final TrainingRepository trainingRepository,
                           final TrainingAttendanceRepository attendanceRepository,
                           final PlayerRepository playerRepository,
                           final TrainingPeriodRepository periodRepository) {
        this.trainingRepository = trainingRepository;
        this.attendanceRepository = attendanceRepository;
        this.playerRepository = playerRepository;
        this.periodRepository = periodRepository;
    }

    @Transactional(readOnly = true)
    public List<TrainingResponse> findAll(final Long periodId) {
        final List<Training> trainings = periodId != null
            ? trainingRepository.findByPeriodIdOrderByDateDesc(periodId)
            : trainingRepository.findAllByOrderByDateDesc();
        return trainings.stream()
            .map(TrainingResponse::from)
            .toList();
    }

    public Training findById(final Long id) {
        return trainingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Training", id));
    }

    @Transactional
    public TrainingResponse create(final LocalDate date, final String time, final String location, final String type) {
        // Upsert: if training on this date exists, update it but keep attendance
        final var existing = trainingRepository.findByDate(date);
        if (existing.isPresent()) {
            final Training training = existing.get();
            training.setTime(time);
            training.setLocation(location);
            if (type != null) {
                training.setType(type);
            }
            return TrainingResponse.from(trainingRepository.save(training));
        }

        final Training training = new Training(date, time, location);
        if (type != null) {
            training.setType(type);
        }
        trainingRepository.save(training);
        autoFillRegularPlayers(training);
        return TrainingResponse.from(training);
    }

    @Transactional
    public List<TrainingResponse> createBulk(final List<Integer> weekdays, final LocalDate startDate,
                                              final LocalDate endDate, final String time,
                                              final String location, final String periodName,
                                              final String type) {
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Startdatum darf nicht nach dem Enddatum liegen");
        }

        final Set<DayOfWeek> targetDays = weekdays.stream()
            .peek(d -> {
                if (d < 1 || d > 7) {
                    throw new IllegalArgumentException("Wochentag muss zwischen 1 (Montag) und 7 (Sonntag) liegen");
                }
            })
            .map(DayOfWeek::of)
            .collect(Collectors.toSet());

        // Find existing period by name, or create new one
        TrainingPeriod period = null;
        if (periodName != null && !periodName.isBlank()) {
            period = periodRepository.findByNameIgnoreCase(periodName.trim())
                .orElseGet(() -> periodRepository.save(new TrainingPeriod(periodName.trim(), startDate, endDate)));
        }

        // Collect all candidate dates
        final List<LocalDate> candidateDates = new ArrayList<>();
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            if (targetDays.contains(date.getDayOfWeek())) {
                candidateDates.add(date);
            }
        }

        // Find existing trainings for upsert
        final Map<LocalDate, Training> existingByDate = trainingRepository
            .findByDateIn(Set.copyOf(candidateDates)).stream()
            .collect(Collectors.toMap(Training::getDate, t -> t));

        final List<TrainingResponse> results = new ArrayList<>();
        for (final LocalDate d : candidateDates) {
            final Training existing = existingByDate.get(d);
            if (existing != null) {
                // Upsert: update fields but keep attendance
                if (time != null) existing.setTime(time);
                if (location != null) existing.setLocation(location);
                if (type != null) existing.setType(type);
                if (period != null) existing.setPeriod(period);
                results.add(TrainingResponse.from(trainingRepository.save(existing)));
            } else {
                final Training training = new Training(d, time, location);
                if (type != null) training.setType(type);
                training.setPeriod(period);
                trainingRepository.save(training);
                autoFillRegularPlayers(training);
                results.add(TrainingResponse.from(training));
            }
        }

        return results;
    }

    @Transactional
    public TrainingResponse update(final Long id, final LocalDate date, final String time,
                                   final String location, final Boolean cancelled, final String type) {
        final Training training = findById(id);
        if (date != null) {
            training.setDate(date);
        }
        training.setTime(time);
        training.setLocation(location);
        if (cancelled != null) {
            training.setCancelled(cancelled);
        }
        if (type != null) {
            training.setType(type);
        }
        return TrainingResponse.from(trainingRepository.save(training));
    }

    @Transactional
    public void delete(final Long id) {
        if (!trainingRepository.existsById(id)) {
            throw new ResourceNotFoundException("Training", id);
        }
        trainingRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<TrainingAttendanceResponse> getAttendance(final Long trainingId) {
        findById(trainingId); // verify training exists
        return attendanceRepository.findByTrainingId(trainingId).stream()
            .map(TrainingAttendanceResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public Map<Long, List<TrainingAttendanceResponse>> getAllAttendance(final Long periodId) {
        final List<Training> trainings = periodId != null
            ? trainingRepository.findByPeriodIdOrderByDateDesc(periodId)
            : trainingRepository.findAllByOrderByDateDesc();

        final List<Long> trainingIds = trainings.stream().map(Training::getId).toList();
        if (trainingIds.isEmpty()) {
            return Map.of();
        }

        return attendanceRepository.findByTrainingIdIn(trainingIds).stream()
            .collect(Collectors.groupingBy(
                a -> a.getTraining().getId(),
                Collectors.mapping(TrainingAttendanceResponse::from, Collectors.toList())
            ));
    }

    @Transactional
    public List<TrainingAttendanceResponse> setAttendance(final Long trainingId,
                                                           final List<SetAttendanceRequest.AttendanceEntry> entries) {
        final Training training = findById(trainingId);

        // Remove existing attendance and flush to avoid unique constraint violations
        attendanceRepository.deleteByTrainingId(trainingId);
        training.getAttendances().clear();
        attendanceRepository.flush();

        // Add new attendance
        for (final SetAttendanceRequest.AttendanceEntry entry : entries) {
            final Player player = playerRepository.findById(entry.playerId())
                .orElseThrow(() -> new ResourceNotFoundException("Player", entry.playerId()));
            final TrainingAttendance attendance = new TrainingAttendance(training, player, entry.present());
            attendanceRepository.save(attendance);
            training.getAttendances().add(attendance);
        }

        return training.getAttendances().stream()
            .map(TrainingAttendanceResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<TrainingStatsResponse> getStats(final Long periodId) {
        final List<Training> allTrainings = periodId != null
            ? trainingRepository.findByPeriodIdOrderByDateDesc(periodId)
            : trainingRepository.findAllByOrderByDateDesc();

        final List<Training> nonCancelledTrainings = allTrainings.stream()
            .filter(t -> !t.isCancelled())
            .toList();

        // Count attended trainings per player (only non-cancelled)
        final Map<Long, Long> attendedCountByPlayer = nonCancelledTrainings.stream()
            .flatMap(t -> t.getAttendances().stream())
            .filter(TrainingAttendance::isPresent)
            .collect(Collectors.groupingBy(
                a -> a.getPlayer().getId(),
                Collectors.counting()
            ));

        final long totalNonCancelled = nonCancelledTrainings.size();

        return playerRepository.findAll().stream()
            .map(player -> new TrainingStatsResponse(
                player.getId(),
                player.getName(),
                attendedCountByPlayer.getOrDefault(player.getId(), 0L),
                totalNonCancelled,
                player.isRegular()
            ))
            .toList();
    }

    // --- CSV Import ---

    private static final DateTimeFormatter CSV_DATE_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy");

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

        // Build player lookup map (name lowercase -> Player)
        final Map<String, Player> playersByName = playerRepository.findAll().stream()
            .collect(Collectors.toMap(
                p -> p.getName().trim().toLowerCase(),
                p -> p,
                (a, b) -> a // in case of duplicates, keep first
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
                    "Ungültiges Datum in Zeile " + (row + 1) + ": '" + columns[0].trim() + "'. Erwartet: DD.MM.YYYY");
            }

            // Skip if training with this date already exists
            if (trainingRepository.existsByDate(date)) {
                skipped++;
                continue;
            }

            // Check if all attendance values are empty/blank → cancelled training
            final boolean allEmpty = isAllAttendanceEmpty(columns, playerNames.size());

            final Training training = new Training(date, null, null);
            training.setCancelled(allEmpty);
            trainingRepository.save(training);

            if (!allEmpty) {
                createAttendanceEntries(training, columns, playerNames, playersByName, notFoundPlayerNames);
            }

            createdTrainings.add(training);
        }

        // Find existing period or create new one, then assign to created trainings
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

    private List<String> parseCsvLines(final String csv) {
        // Strip BOM if present
        String cleaned = csv;
        if (cleaned.startsWith("\uFEFF")) {
            cleaned = cleaned.substring(1);
        }

        final List<String> lines = new ArrayList<>();
        try (final BufferedReader reader = new BufferedReader(new StringReader(cleaned))) {
            String line;
            while ((line = reader.readLine()) != null) {
                // Skip completely empty lines
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

            final TrainingAttendance attendance = new TrainingAttendance(training, player, present);
            attendanceRepository.save(attendance);
            training.getAttendances().add(attendance);
        }
    }

    // --- Period management ---

    @Transactional(readOnly = true)
    public List<TrainingPeriodResponse> findAllPeriods() {
        return periodRepository.findAllByOrderByStartDateDesc().stream()
            .map(TrainingPeriodResponse::from)
            .toList();
    }

    @Transactional
    public TrainingPeriodResponse createPeriod(final String name, final LocalDate startDate, final LocalDate endDate) {
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Startdatum darf nicht nach dem Enddatum liegen");
        }
        return TrainingPeriodResponse.from(periodRepository.save(new TrainingPeriod(name, startDate, endDate)));
    }

    @Transactional
    public void deletePeriod(final Long periodId) {
        if (!periodRepository.existsById(periodId)) {
            throw new ResourceNotFoundException("TrainingPeriod", periodId);
        }
        // Unlink trainings from this period (don't delete the trainings themselves)
        final List<Training> trainings = trainingRepository.findByPeriodIdOrderByDateDesc(periodId);
        for (final Training training : trainings) {
            training.setPeriod(null);
        }
        trainingRepository.saveAll(trainings);
        periodRepository.deleteById(periodId);
    }

    private void autoFillRegularPlayers(final Training training) {
        final List<Player> regularPlayers = playerRepository.findAll().stream()
            .filter(Player::isRegular)
            .toList();
        for (final Player player : regularPlayers) {
            final TrainingAttendance attendance = new TrainingAttendance(training, player, true);
            attendanceRepository.save(attendance);
            training.getAttendances().add(attendance);
        }
    }
}
