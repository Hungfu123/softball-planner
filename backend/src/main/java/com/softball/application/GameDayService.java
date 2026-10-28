package com.softball.application;

import com.softball.adapter.dto.GameDayPlayerStats;
import com.softball.adapter.dto.GameDayResponse;
import com.softball.domain.model.*;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.AtBatRepository;
import com.softball.domain.port.out.GameDayRepository;
import com.softball.domain.port.out.GameStaffRepository;
import com.softball.domain.port.out.LineupEntryRepository;
import com.softball.domain.port.out.SubstitutionRepository;
import com.softball.domain.service.AufstellungsFingerabdruck;
import com.softball.shared.security.AufstellungSichtbarkeit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GameDayService {

    private static final Logger log = LoggerFactory.getLogger(GameDayService.class);

    private final GameDayRepository gameDayRepository;
    private final LineupEntryRepository lineupEntryRepository;
    private final AtBatRepository atBatRepository;
    private final GameStaffRepository gameStaffRepository;
    private final SubstitutionRepository substitutionRepository;
    private final SeasonService seasonService;
    private final AvailabilityService availabilityService;
    private final GameScoringService gameScoringService;
    private final AufstellungSichtbarkeit sichtbarkeit;

    public GameDayService(final GameDayRepository gameDayRepository,
                          final LineupEntryRepository lineupEntryRepository,
                          final AtBatRepository atBatRepository,
                          final GameStaffRepository gameStaffRepository,
                          final SubstitutionRepository substitutionRepository,
                          final SeasonService seasonService,
                          final AvailabilityService availabilityService,
                          final GameScoringService gameScoringService,
                          final AufstellungSichtbarkeit sichtbarkeit) {
        this.gameDayRepository = gameDayRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.atBatRepository = atBatRepository;
        this.gameStaffRepository = gameStaffRepository;
        this.substitutionRepository = substitutionRepository;
        this.seasonService = seasonService;
        this.availabilityService = availabilityService;
        this.gameScoringService = gameScoringService;
        this.sichtbarkeit = sichtbarkeit;
    }

    @Transactional(readOnly = true)
    public List<GameDayResponse> findBySeasonIdAsDto(final Long seasonId) {
        final List<GameDay> days = gameDayRepository.findBySeasonIdOrderByDateAsc(seasonId);
        final List<Long> gameIds = days.stream()
            .flatMap(d -> d.getGames().stream())
            .map(Game::getId)
            .filter(java.util.Objects::nonNull)
            .toList();
        final Map<Long, Long> counts = atBatRepository.countByGameIds(gameIds);
        final Map<Long, Integer> liveScores = gameScoringService.computeLiveScoreUsByGameIds(gameIds);
        final Set<Long> geaendert = spieltageMitGeaenderterAufstellung(days);
        return days.stream()
            .map(d -> GameDayResponse.from(d, counts, liveScores, geaendert.contains(d.getId()), sichtbarkeit.lage(d)))
            .toList();
    }

    /** Alle Spieltage über alle Saisons (für die Kalender-Übersicht). */
    @Transactional(readOnly = true)
    public List<GameDayResponse> findAllAsDto() {
        return seasonService.findAll().stream()
            .flatMap(s -> findBySeasonIdAsDto(s.getId()).stream())
            .toList();
    }

    @Transactional(readOnly = true)
    public GameDayResponse findByIdAsDto(final Long id) {
        return toResponseWithLive(findById(id));
    }

    private GameDayResponse toResponseWithLive(final GameDay gameDay) {
        final List<Long> gameIds = gameDay.getGames().stream()
            .map(Game::getId)
            .filter(java.util.Objects::nonNull)
            .toList();
        final Map<Long, Long> counts = atBatRepository.countByGameIds(gameIds);
        final Map<Long, Integer> liveScores = gameScoringService.computeLiveScoreUsByGameIds(gameIds);
        return GameDayResponse.from(gameDay, counts, liveScores, istSeitDerFreigabeGeaendert(gameDay),
            sichtbarkeit.lage(gameDay));
    }

    /**
     * Leseseite der Freigabe: hat sich die Aufstellung seit dem Freigeben bewegt? Vergleicht
     * den Fingerabdruck von jetzt mit dem beim Freigeben gespeicherten. Solange nichts
     * freigegeben ist, gibt es nichts, was sich "seitdem" geaendert haben koennte.
     */
    @Transactional(readOnly = true)
    public boolean istSeitDerFreigabeGeaendert(final GameDay gameDay) {
        return spieltageMitGeaenderterAufstellung(List.of(gameDay)).contains(gameDay.getId());
    }

    /**
     * Stapelform von {@link #istSeitDerFreigabeGeaendert}: drei Abfragen fuer alle Spieltage
     * zusammen statt drei je Spieltag, und gar keine, wenn keiner freigegeben ist.
     *
     * <p>Gerechnet wird nur fuer Spieltage von heute an. Der Haken beantwortet "der Stand, den
     * ich freigegeben habe, ist nicht mehr der, der dasteht" — das fragt man vor dem Spiel,
     * nicht danach. Ein vergangener Spieltag meldet daher immer {@code false}, auch wenn seine
     * Aufstellung nachtraeglich geaendert wird (gewollt). Die Kosten bleiben so konstant, statt
     * mit jeder Saison zu wachsen; das zaehlt, weil {@code /api/calendar.ics} (offen, im Takt
     * von Kalender-Clients gepollt) denselben Weg nimmt, den Haken aber nie liest.
     */
    private Set<Long> spieltageMitGeaenderterAufstellung(final List<GameDay> days) {
        final List<GameDay> freigegeben = days.stream()
            .filter(d -> d.getLineupsReleasedAt() != null)
            .filter(d -> d.getDate() != null && !d.getDate().isBefore(LocalDate.now()))
            .toList();
        final Map<Long, String> abdruecke = aktuelleAbdruecke(freigegeben);
        return freigegeben.stream()
            .filter(d -> !abdruecke.get(d.getId()).equals(d.getLineupsReleasedHash()))
            .map(GameDay::getId)
            .collect(Collectors.toSet());
    }

    /** Fingerabdruck des heutigen Standes je Spieltag; drei Abfragen fuer alle zusammen. */
    private Map<Long, String> aktuelleAbdruecke(final List<GameDay> days) {
        if (days.isEmpty()) return Map.of();

        final Map<Long, Long> spieltagJeSpiel = new HashMap<>();
        for (final GameDay day : days) {
            for (final Game game : day.getGames()) {
                if (game.getId() != null) spieltagJeSpiel.put(game.getId(), day.getId());
            }
        }
        final List<Long> gameIds = List.copyOf(spieltagJeSpiel.keySet());
        final Map<Long, List<LineupEntry>> aufstellung = gameIds.isEmpty() ? Map.of()
            : lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(gameIds).stream()
                .collect(Collectors.groupingBy(e -> spieltagJeSpiel.get(e.getGame().getId())));
        final Map<Long, List<GameStaff>> staff = gameIds.isEmpty() ? Map.of()
            : gameStaffRepository.findByGameIdIn(gameIds).stream()
                .collect(Collectors.groupingBy(e -> spieltagJeSpiel.get(e.getGame().getId())));
        final Map<Long, List<Substitution>> wechsel = gameIds.isEmpty() ? Map.of()
            : substitutionRepository.findByGameIdIn(gameIds).stream()
                .collect(Collectors.groupingBy(e -> spieltagJeSpiel.get(e.getGame().getId())));

        final Map<Long, String> abdruecke = new HashMap<>();
        for (final GameDay day : days) {
            abdruecke.put(day.getId(), AufstellungsFingerabdruck.von(
                aufstellung.getOrDefault(day.getId(), List.of()),
                staff.getOrDefault(day.getId(), List.of()),
                wechsel.getOrDefault(day.getId(), List.of())));
        }
        return abdruecke;
    }

    /**
     * Der Schalter: freigeben merkt sich Zeitpunkt und Fingerabdruck des heutigen Standes,
     * zuruecknehmen loescht beides. Erneut freigeben ist dasselbe wie freigeben und setzt
     * damit den "geaendert"-Haken zurueck.
     */
    @Transactional
    public GameDay setLineupsReleased(final Long gameDayId, final boolean released) {
        final GameDay gameDay = findById(gameDayId);
        if (released) {
            gameDay.setLineupsReleasedAt(LocalDateTime.now());
            gameDay.setLineupsReleasedHash(aktuelleAbdruecke(List.of(gameDay)).get(gameDayId));
        } else {
            gameDay.setLineupsReleasedAt(null);
            gameDay.setLineupsReleasedHash(null);
        }
        log.info("Spieltag {}: Aufstellung {}", gameDayId, released ? "freigegeben" : "zurueckgenommen");
        return gameDayRepository.save(gameDay);
    }

    @Transactional
    public GameDayResponse releaseLineupsAsDto(final Long gameDayId, final boolean released) {
        return toResponseWithLive(setLineupsReleased(gameDayId, released));
    }

    @Transactional(readOnly = true)
    public GameDay findById(final Long id) {
        return gameDayRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("GameDay", id));
    }

    @Transactional
    public GameDayResponse create(final Long seasonId, final LocalDate date, final String label, final String location,
                                   final Integer numberOfGames) {
        log.info("Spieltag erstellen: Saison={}, Datum={}, Ort={}, Spiele={}", seasonId, date, location, numberOfGames);
        if (gameDayRepository.existsBySeasonAndDate(seasonId, date)) {
            throw new BusinessValidationException("Es gibt bereits einen Spieltag am " + date + " in dieser Saison");
        }
        final Season season = seasonService.findById(seasonId);
        final GameDay gameDay = new GameDay(date, label, location, season);

        final int count = (numberOfGames != null) ? numberOfGames : 3;
        for (int i = 1; i <= count; i++) {
            final Game game = new Game();
            game.setGameNumber(i);
            game.setGameDay(gameDay);
            gameDay.getGames().add(game);
        }

        final GameDay saved = gameDayRepository.save(gameDay);
        return toResponseWithLive(saved);
    }

    @Transactional
    public GameDayResponse setAvailablePlayers(final Long gameDayId, final List<Long> playerIds) {
        final GameDay saved = availabilityService.setAvailablePlayers(gameDayId, playerIds);
        return toResponseWithLive(saved);
    }

    @Transactional
    public GameDayResponse update(final Long id, final LocalDate date, final String label, final String location,
                                   final Integer numberOfGames) {
        final GameDay gameDay = findById(id);
        if (date != null && !date.equals(gameDay.getDate())) {
            if (gameDayRepository.existsBySeasonAndDate(gameDay.getSeason().getId(), date)) {
                throw new BusinessValidationException("Es gibt bereits einen Spieltag am " + date + " in dieser Saison");
            }
            gameDay.setDate(date);
        }
        gameDay.setLabel(label);
        gameDay.setLocation(location);

        if (numberOfGames != null) {
            adjustGameCount(gameDay, numberOfGames);
        }

        final GameDay saved = gameDayRepository.save(gameDay);
        saved.getGames().size();
        return toResponseWithLive(saved);
    }

    private void adjustGameCount(final GameDay gameDay, final int newCount) {
        final List<Game> games = gameDay.getGames();
        games.sort(Comparator.comparing(Game::getGameNumber));
        final int currentCount = games.size();
        if (newCount == currentCount) return;

        if (newCount > currentCount) {
            for (int i = currentCount + 1; i <= newCount; i++) {
                final Game game = new Game();
                game.setGameNumber(i);
                game.setGameDay(gameDay);
                games.add(game);
            }
            log.info("Spieltag {}: {} Spiele hinzugefuegt (jetzt {})", gameDay.getId(), newCount - currentCount, newCount);
            return;
        }

        // newCount < currentCount → shrink: prüfe Scoring-Daten
        final List<Game> toRemove = new ArrayList<>(games.subList(newCount, currentCount));
        final List<Long> removeIds = toRemove.stream().map(Game::getId).filter(Objects::nonNull).toList();
        if (!removeIds.isEmpty()) {
            final Map<Long, Long> atBatCounts = atBatRepository.countByGameIds(removeIds);
            final long withScoring = atBatCounts.values().stream().filter(c -> c > 0).count();
            if (withScoring > 0) {
                throw new BusinessValidationException(
                    "Kann Spiele nicht entfernen: " + withScoring + " Spiel(e) haben Scoring-Daten. "
                    + "Erst Scoring zurücksetzen oder weniger Spiele behalten."
                );
            }
        }
        games.removeAll(toRemove);
        log.info("Spieltag {}: {} Spiele entfernt (jetzt {})", gameDay.getId(), currentCount - newCount, newCount);
    }

    @Transactional
    public void delete(final Long id) {
        log.info("Spieltag loeschen: {}", id);
        if (!gameDayRepository.existsById(id)) {
            throw new ResourceNotFoundException("GameDay", id);
        }
        gameDayRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<GameDayPlayerStats> getStats(final Long gameDayId) {
        final GameDay gameDayWithPlayers = gameDayRepository.findByIdWithPlayers(gameDayId)
            .orElseThrow(() -> new ResourceNotFoundException("GameDay", gameDayId));
        final GameDay gameDayWithGames = gameDayRepository.findByIdWithGames(gameDayId)
            .orElseThrow(() -> new ResourceNotFoundException("GameDay", gameDayId));

        final Collection<Player> available = gameDayWithPlayers.getAvailablePlayers();
        final List<Game> games = gameDayWithGames.getGames();

        // Batch-load all lineup entries for all games (avoids N+1)
        final List<Long> gameIds = games.stream().map(Game::getId).toList();
        final List<LineupEntry> allEntries = lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(gameIds);
        final Map<Long, List<LineupEntry>> entriesByGame = allEntries.stream()
            .collect(Collectors.groupingBy(e -> e.getGame().getId()));

        // Map game ID -> game number for position lookups
        final Map<Long, Integer> gameNumberById = games.stream()
            .collect(Collectors.toMap(Game::getId, Game::getGameNumber));

        return available.stream()
            .map(player -> buildPlayerStats(player, games, entriesByGame, gameNumberById))
            .sorted(Comparator.comparingDouble(GameDayPlayerStats::gameCount))
            .collect(Collectors.toList());
    }

    private GameDayPlayerStats buildPlayerStats(final Player player, final List<Game> games,
                                                 final Map<Long, List<LineupEntry>> entriesByGame,
                                                 final Map<Long, Integer> gameNumberById) {
        double gameCount = 0;
        final List<GameDayPlayerStats.GamePosition> positions = new ArrayList<>();

        for (final Game game : games) {
            final List<LineupEntry> entries = entriesByGame.getOrDefault(game.getId(), List.of());
            for (final LineupEntry entry : entries) {
                if (entry.getPlayer().getId().equals(player.getId())) {
                    final Position pos = entry.getPosition();
                    // Field-Host mit DH zählt 0.5 (Batting an DH abgegeben) — DH-Spiel teilt sich 0.5/0.5
                    final double weight = entry.getDhBatterPlayer() != null
                        ? 0.5
                        : (pos != null ? pos.getGameWeight() : 1.0);
                    gameCount += weight;
                    positions.add(new GameDayPlayerStats.GamePosition(game.getGameNumber(),
                        pos != null ? pos.displayName() : null, weight));
                }
                if (entry.getDhBatterPlayer() != null && entry.getDhBatterPlayer().getId().equals(player.getId())) {
                    gameCount += 0.5;
                    positions.add(new GameDayPlayerStats.GamePosition(game.getGameNumber(), "DH", 0.5));
                }
            }
        }

        return new GameDayPlayerStats(player.getId(), player.getName(), gameCount, positions);
    }
}
