package com.softball.application;

import com.softball.domain.model.AtBat;
import com.softball.domain.model.BaseRunningEvent;
import com.softball.domain.model.Game;
import com.softball.domain.model.Player;
import com.softball.domain.model.PlayerFormPoint;
import com.softball.domain.model.PlayerUsage;
import com.softball.domain.model.Training;
import com.softball.domain.model.TrainingAnwesenheit;
import com.softball.domain.model.TrainingAttendance;
import com.softball.domain.model.UsageScope;
import com.softball.domain.port.out.AtBatRepository;
import com.softball.domain.port.out.BaseRunningEventRepository;
import com.softball.domain.port.out.GameDayRepository;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.LineupEntryRepository;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.TrainingAttendanceRepository;
import com.softball.domain.port.out.TrainingRepository;
import com.softball.domain.service.BattingTimelineCalculator;
import com.softball.domain.service.PlayerUsageCalculator;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Auswertungen für EINEN Spieler — die Datenbasis der Spielerprofil-Seite.
 *
 * Bewusst neben {@link BattingStatsService} statt darin: die rechnet Tabellen über
 * Spieler-Mengen (Spiel/Saison/Gegner), hier geht es um den Verlauf eines einzelnen.
 *
 * Quelle ist wie beim Spiel-Verlauf ausschließlich das Old-Scoring (At-Bats);
 * Spielbogen-Daten fließen nicht ein, sonst spränge die Kurve je nach Erfassungsart.
 */
@Service
public class PlayerProfileService {

    private static final BattingTimelineCalculator CALCULATOR = new BattingTimelineCalculator();
    private static final PlayerUsageCalculator USAGE_CALCULATOR = new PlayerUsageCalculator();

    /**
     * „Heute" ist das Berliner Heute — wie bei der Aufstellungs-Lage und aus demselben Grund.
     *
     * Die Zone des Containers wird bewusst nicht gestellt, sie ist UTC. Zwischen 23 Uhr UTC
     * (22 im Sommer) und Mitternacht ist in Berlin schon der naechste Tag; wer das Profil in
     * dieser Stunde aufmacht, saehe den Spieltag von gestern nicht gezaehlt, weil er dem
     * Server noch als „heute" gilt. Das ist keine Theorie: an dieser Stunde ist die naechtliche
     * CI gescheitert.
     */
    private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");

    private final PlayerRepository playerRepository;
    private final AtBatRepository atBatRepository;
    private final GameRepository gameRepository;
    private final BaseRunningEventRepository baseRunningEventRepository;
    private final GameDayRepository gameDayRepository;
    private final LineupEntryRepository lineupEntryRepository;
    private final TrainingRepository trainingRepository;
    private final TrainingAttendanceRepository attendanceRepository;
    private final Clock clock;

    public PlayerProfileService(final PlayerRepository playerRepository,
                                final AtBatRepository atBatRepository,
                                final GameRepository gameRepository,
                                final BaseRunningEventRepository baseRunningEventRepository,
                                final GameDayRepository gameDayRepository,
                                final LineupEntryRepository lineupEntryRepository,
                                final TrainingRepository trainingRepository,
                                final TrainingAttendanceRepository attendanceRepository,
                                final Clock clock) {
        this.playerRepository = playerRepository;
        this.atBatRepository = atBatRepository;
        this.gameRepository = gameRepository;
        this.baseRunningEventRepository = baseRunningEventRepository;
        this.gameDayRepository = gameDayRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.trainingRepository = trainingRepository;
        this.attendanceRepository = attendanceRepository;
        this.clock = clock;
    }

    /** Der Tag, der in Berlin gerade laeuft. */
    private LocalDate heute() {
        return LocalDate.now(clock.withZone(BERLIN));
    }

    /** Form-Kurve: ein Punkt je Spiel mit Plate Appearance, ältestes zuerst. */
    @Transactional(readOnly = true)
    public List<PlayerFormPoint> getFormTimeline(final Long playerId) {
        final Player player = playerRepository.findById(playerId)
            .orElseThrow(() -> new ResourceNotFoundException("Player", playerId));

        final List<AtBat> atBats = atBatRepository.findByBatterIdOrderByGameAndSequence(playerId);
        if (atBats.isEmpty()) return List.of();

        final List<Long> gameIds = atBats.stream()
            .map(AtBat::getGame).filter(Objects::nonNull).map(Game::getId).filter(Objects::nonNull)
            .distinct().toList();
        final Map<Long, Game> gamesById = gameRepository.findAllByIdWithDetails(gameIds).stream()
            .collect(java.util.stream.Collectors.toMap(Game::getId, Function.identity(), (a, b) -> a));

        // Steals desselben Spielers je Spiel — die At-Bats kennen sie nicht, sie sind
        // eigene Events. Gelesen wird über die Spiele, in denen er am Schlag war.
        final Map<Long, List<BaseRunningEvent>> stealsByGame = baseRunningEventRepository
            .findByGameIdInOrderByIdAsc(gameIds).stream()
            .filter(e -> e.getRunner() != null && playerId.equals(e.getRunner().getId()))
            .filter(e -> e.getGame() != null && e.getGame().getId() != null)
            .collect(java.util.stream.Collectors.groupingBy(e -> e.getGame().getId()));

        return CALCULATOR.calculate(player, atBats, gamesById, stealsByGame);
    }

    /**
     * Einsatz-Profil: Zusagen, Aufstellungen, Training und Schlagplatz.
     *
     * Bewusst eine eigene Abfrage neben der Form-Kurve: wer das Profil nur zum Schlagen
     * aufmacht, soll nicht alle Spieltage und Trainings mitladen.
     */
    @Transactional(readOnly = true)
    public PlayerUsage getUsage(final Long playerId) {
        return getUsage(playerId, UsageScope.all());
    }

    /** @param scope Jahr, Saison oder alles. */
    @Transactional(readOnly = true)
    public PlayerUsage getUsage(final Long playerId, final UsageScope scope) {
        if (!playerRepository.existsById(playerId)) {
            throw new ResourceNotFoundException("Player", playerId);
        }

        final Set<Long> availableGameDayIds = new HashSet<>(gameDayRepository.findGameDayIdsByAvailablePlayer(playerId));
        final Set<Long> playedGameDayIds = new HashSet<>(lineupEntryRepository.findGameDayIdsByPlayerId(playerId));
        final List<Integer> battingOrders = battingOrders(playerId, scope);
        final Set<Long> attendedTrainingIds = attendanceRepository.findByPlayerId(playerId).stream()
            .filter(TrainingAttendance::isPresent)
            .filter(a -> a.getTraining() != null && a.getTraining().getId() != null)
            .map(a -> a.getTraining().getId())
            .collect(Collectors.toSet());

        return USAGE_CALCULATOR.calculate(
            gameDayRepository.findAll(),
            availableGameDayIds,
            playedGameDayIds,
            battingOrders,
            // Ohne Trainings-Bezug gar nicht erst laden — eine Saison kennt keine.
            scope.coversTrainings() ? trainingRepository.findAllByOrderByDateDesc() : List.of(),
            attendedTrainingIds,
            heute(),
            scope
        );
    }

    /**
     * Anwesenheit je Monat eines Jahres: Monat (1..12) auf Anzahl der besuchten Trainings.
     *
     * Die SCHLICHTE Anwesenheit, nicht die gewichtete Quote der Auto-Aufstellung: Termine mit
     * eingeschraenktem Teilnehmerkreis zaehlen hier mit, wenn man da war, und fehlen sonst
     * einfach. „Wie oft war ich da" ist eine andere Frage als „wie verlaesslich bin ich", und
     * nur die erste beantwortet diese Karte.
     *
     * Abgesagte Trainings fallen raus — bei einem abgesagten Termin war niemand da.
     */
    @Transactional(readOnly = true)
    public TrainingAnwesenheit getTrainingMonths(final Long playerId, final int year) {
        if (!playerRepository.existsById(playerId)) {
            throw new ResourceNotFoundException("Player", playerId);
        }
        final Map<Integer, Integer> jeMonat = new HashMap<>();
        LocalDate zuletzt = null;
        for (final TrainingAttendance a : attendanceRepository.findByPlayerId(playerId)) {
            if (!a.isPresent() || a.getTraining() == null) {
                continue;
            }
            final Training t = a.getTraining();
            if (t.isCancelled() || t.getDate() == null) {
                continue;
            }
            if (t.getDate().getYear() == year) {
                jeMonat.merge(t.getDate().getMonthValue(), 1, Integer::sum);
            }
            // Ueber alle Jahre: wer im Dezember zuletzt da war, ist im Januar nicht „noch nie".
            if (zuletzt == null || t.getDate().isAfter(zuletzt)) {
                zuletzt = t.getDate();
            }
        }
        return new TrainingAnwesenheit(jeMonat, zuletzt == null ? null : verpasstSeit(zuletzt));
    }

    /**
     * Wie viele Termine seit diesem Tag gelaufen sind, zu denen der GANZE Kader geladen war.
     *
     * `openToAll` ist der Kern: wer kein Pitcher und kein Catcher ist, hat eine Nur-P/C-Einheit
     * nicht versaeumt, und ein Hinweis, der ihm das vorhaelt, waere schlicht falsch. Abgesagte
     * Termine fallen ebenfalls raus — bei einem abgesagten Training war niemand da.
     *
     * Gezaehlt wird STRENG NACH dem Tag: das Training, bei dem man zuletzt war, zaehlt nicht
     * gegen einen.
     */
    private int verpasstSeit(final LocalDate zuletzt) {
        final LocalDate heute = heute();
        return (int) trainingRepository.findAllByOrderByDateDesc().stream()
            .filter(t -> t.getDate() != null && t.isOpenToAll() && !t.isCancelled())
            .filter(t -> t.getDate().isAfter(zuletzt) && !t.getDate().isAfter(heute))
            .count();
    }


    private List<Integer> battingOrders(final Long playerId, final UsageScope scope) {
        final LocalDate heute = heute();
        if (scope.seasonId() != null) {
            return lineupEntryRepository.findBattingOrdersByPlayerIdAndSeason(playerId, scope.seasonId(), heute);
        }
        if (scope.year() != null) {
            return lineupEntryRepository.findBattingOrdersByPlayerIdAndYear(playerId, scope.year(), heute);
        }
        return lineupEntryRepository.findBattingOrdersByPlayerId(playerId, heute);
    }
}
