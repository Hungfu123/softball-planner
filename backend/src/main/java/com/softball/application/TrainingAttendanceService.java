package com.softball.application;

import com.softball.adapter.dto.SetAttendanceRequest;
import com.softball.adapter.dto.TrainingAttendanceResponse;
import com.softball.domain.model.Player;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingAttendance;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import com.softball.domain.port.out.TrainingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TrainingAttendanceService {

    private final TrainingRepository trainingRepository;
    private final TrainingAttendanceRepository attendanceRepository;
    private final PlayerRepository playerRepository;

    public TrainingAttendanceService(final TrainingRepository trainingRepository,
                                      final TrainingAttendanceRepository attendanceRepository,
                                      final PlayerRepository playerRepository) {
        this.trainingRepository = trainingRepository;
        this.attendanceRepository = attendanceRepository;
        this.playerRepository = playerRepository;
    }

    @Transactional(readOnly = true)
    public List<TrainingAttendanceResponse> getAttendance(final Long trainingId) {
        findTraining(trainingId);
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
        final Training training = findTraining(trainingId);

        attendanceRepository.deleteByTrainingId(trainingId);
        trainingRepository.flush();
        training.getAttendances().clear();

        final List<Long> playerIds = entries.stream().map(SetAttendanceRequest.AttendanceEntry::playerId).toList();
        final Map<Long, Player> playerMap = playerRepository.findAllById(playerIds).stream()
            .collect(Collectors.toMap(Player::getId, p -> p));
        if (playerMap.size() != playerIds.size()) {
            throw new ResourceNotFoundException("Einige Spieler wurden nicht gefunden");
        }

        final List<TrainingAttendance> newAttendances = new ArrayList<>();
        for (final SetAttendanceRequest.AttendanceEntry entry : entries) {
            final Player player = playerMap.get(entry.playerId());
            final TrainingAttendance attendance = new TrainingAttendance(training, player, entry.present());
            newAttendances.add(attendance);
            training.getAttendances().add(attendance);
        }
        attendanceRepository.saveAll(newAttendances);

        return training.getAttendances().stream()
            .map(TrainingAttendanceResponse::from)
            .toList();
    }

    private Training findTraining(final Long id) {
        return trainingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Training", id));
    }
}
