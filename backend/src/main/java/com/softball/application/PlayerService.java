package com.softball.application;

import com.softball.domain.model.Player;
import com.softball.domain.model.PositionSlot;
import com.softball.domain.service.PositionProfileValidator;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.AtBatRepository;
import com.softball.domain.port.out.BaseRunningEventRepository;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.SubstitutionRepository;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PlayerService {

    private static final Logger log = LoggerFactory.getLogger(PlayerService.class);

    private static final PositionProfileValidator POSITION_VALIDATOR = new PositionProfileValidator();

    private final PlayerRepository playerRepository;
    private final AtBatRepository atBatRepository;
    private final BaseRunningEventRepository baseRunningEventRepository;
    private final SubstitutionRepository substitutionRepository;
    private final TrainingAttendanceRepository trainingAttendanceRepository;
    private final AvailabilityService availabilityService;

    public PlayerService(final PlayerRepository playerRepository, final AtBatRepository atBatRepository,
                         final BaseRunningEventRepository baseRunningEventRepository,
                         final SubstitutionRepository substitutionRepository,
                         final TrainingAttendanceRepository trainingAttendanceRepository,
                         final AvailabilityService availabilityService) {
        this.playerRepository = playerRepository;
        this.atBatRepository = atBatRepository;
        this.baseRunningEventRepository = baseRunningEventRepository;
        this.substitutionRepository = substitutionRepository;
        this.trainingAttendanceRepository = trainingAttendanceRepository;
        this.availabilityService = availabilityService;
    }

    @Transactional(readOnly = true)
    public List<Player> findAll() {
        return playerRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Player> findAll(final boolean includeArchived) {
        final List<Player> all = playerRepository.findAll();
        return includeArchived ? all : all.stream().filter(p -> !p.isArchived()).toList();
    }

    @Transactional(readOnly = true)
    public Player findById(final Long id) {
        return playerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Player", id));
    }

    public Player create(final String name) {
        return playerRepository.save(new Player(name));
    }

    public Player update(final Long id, final String name, final Boolean regular) {
        final Player player = findById(id);
        if (name != null && !name.isBlank()) {
            player.setName(name);
        }
        if (regular != null) {
            player.setRegular(regular);
        }
        return playerRepository.save(player);
    }

    /**
     * Setzt das Positions-Profil (Primär/Sekundär/Tertiär). null in einem Slot löscht ihn.
     * Reine Stammdaten — die Lineup-Vorschläge lesen das Profil (noch) nicht.
     */
    public Player updatePositionProfile(final Long id,
                                        final PositionSlot primary,
                                        final PositionSlot secondary,
                                        final PositionSlot tertiary) {
        final List<String> errors = POSITION_VALIDATOR.validate(primary, secondary, tertiary);
        if (!errors.isEmpty()) {
            throw new BusinessValidationException(String.join(", ", errors));
        }
        final Player player = findById(id);
        player.setPrimaryPosition(primary);
        player.setSecondaryPosition(secondary);
        player.setTertiaryPosition(tertiary);
        final Player saved = playerRepository.save(player);
        log.info("Positions-Profil für Spieler {} gesetzt: {} / {} / {}", id, primary, secondary, tertiary);
        return saved;
    }

    /**
     * Löscht einen Spieler samt seiner Planungs-Referenzen (Availability, Lineups,
     * Staff, Trainings-Anwesenheit). Hat der Spieler bereits Scoring-Daten
     * (At-Bats, Baserunning, Spielerwechsel), wird das Löschen verweigert —
     * sonst würde die Spielhistorie und die Statistiken anderer Spieler beschädigt.
     */
    @Transactional
    public void delete(final Long id) {
        final Player player = findById(id);

        if (atBatRepository.existsByPlayerId(id)
            || baseRunningEventRepository.existsByRunnerPlayerId(id)
            || substitutionRepository.existsByPlayerId(id)) {
            throw new BusinessValidationException(
                "Spieler '" + player.getName() + "' hat bereits Scoring-Daten (At-Bats, Baserunning oder "
                    + "Spielerwechsel) und kann nicht gelöscht werden — sonst würde die Spielhistorie "
                    + "und die Statistiken anderer Spieler beschädigt.");
        }

        availabilityService.removeAllPlanningReferences(id);
        trainingAttendanceRepository.deleteByPlayerId(id);
        playerRepository.deleteById(id);
        log.info("Spieler {} ('{}') gelöscht, Planungs- und Trainings-Referenzen bereinigt", id, player.getName());
    }

    /**
     * Archiviert einen Spieler (ausgeschieden): Er verschwindet aus allen Auswahllisten
     * und der Statistik, seine Historie (At-Bats, Steals) bleibt aber erhalten —
     * im Gegensatz zum Löschen bleiben damit die über den BaseRunningReplay
     * berechneten Runs der Mitspieler korrekt. Beim Archivieren werden seine
     * Planungs-Referenzen (Availability, Lineups, Staff) und Trainings-Anwesenheit
     * bereinigt, wie beim Löschen.
     */
    @Transactional
    public Player setArchived(final Long id, final boolean archived) {
        final Player player = findById(id);
        if (archived && !player.isArchived()) {
            availabilityService.removeAllPlanningReferences(id);
            trainingAttendanceRepository.deleteByPlayerId(id);
        }
        player.setArchived(archived);
        final Player saved = playerRepository.save(player);
        log.info("Spieler {} ('{}') {}{}", id, saved.getName(), archived ? "archiviert" : "reaktiviert",
            archived ? ", Planungs- und Trainings-Referenzen bereinigt" : "");
        return saved;
    }

    @Transactional
    public Player setWhatsappName(final Long id, final String whatsappName) {
        final Player player = playerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Player", id));
        final String normalized = (whatsappName == null || whatsappName.isBlank()) ? null : whatsappName.trim();
        player.setWhatsappName(normalized);
        return playerRepository.save(player);
    }

    @Transactional
    public List<Player> updateBattingOrder(final List<Long> orderedPlayerIds) {
        final List<Player> allPlayers = playerRepository.findAll();

        for (final Player player : allPlayers) {
            final int index = orderedPlayerIds.indexOf(player.getId());
            player.setDefaultBattingOrder(index >= 0 ? index + 1 : null);
        }

        for (final Player player : allPlayers) {
            playerRepository.save(player);
        }

        return allPlayers;
    }
}
