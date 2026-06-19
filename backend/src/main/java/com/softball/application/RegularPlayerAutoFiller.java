package com.softball.application;

import com.softball.domain.model.Player;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingAttendance;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import org.springframework.stereotype.Component;

import java.util.List;

/** Füllt ein frisch erstelltes Training automatisch mit allen Stammspielern (regular=true) als anwesend. */
@Component
public class RegularPlayerAutoFiller {

    private final PlayerRepository playerRepository;
    private final TrainingAttendanceRepository attendanceRepository;

    public RegularPlayerAutoFiller(final PlayerRepository playerRepository,
                                    final TrainingAttendanceRepository attendanceRepository) {
        this.playerRepository = playerRepository;
        this.attendanceRepository = attendanceRepository;
    }

    public void autoFill(final Training training) {
        final List<Player> regularPlayers = playerRepository.findByRegularTrue();
        final List<TrainingAttendance> attendances = regularPlayers.stream()
            .map(player -> new TrainingAttendance(training, player, true))
            .toList();
        attendanceRepository.saveAll(attendances);
        training.getAttendances().addAll(attendances);
    }
}
