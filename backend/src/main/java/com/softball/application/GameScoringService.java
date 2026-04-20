package com.softball.application;

import com.softball.adapter.dto.AtBatResponse;
import com.softball.adapter.dto.RecordAtBatRequest;
import com.softball.adapter.dto.RecordStealingEventRequest;
import com.softball.adapter.dto.ScoreboardResponse;
import com.softball.adapter.dto.StealingEventResponse;
import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class GameScoringService {

    private final GameRepository gameRepository;
    private final PlayerRepository playerRepository;
    private final LineupEntryRepository lineupEntryRepository;
    private final AtBatRepository atBatRepository;
    private final BaseRunningEventRepository stealingRepository;

    public GameScoringService(final GameRepository gameRepository,
                               final PlayerRepository playerRepository,
                               final LineupEntryRepository lineupEntryRepository,
                               final AtBatRepository atBatRepository,
                               final BaseRunningEventRepository stealingRepository) {
        this.gameRepository = gameRepository;
        this.playerRepository = playerRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.atBatRepository = atBatRepository;
        this.stealingRepository = stealingRepository;
    }

    @Transactional(readOnly = true)
    public List<AtBatResponse> getAtBats(final Long gameId) {
        findGame(gameId);
        return atBatRepository.findByGameIdOrderBySequenceAsc(gameId).stream()
            .map(AtBatResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<StealingEventResponse> getStealingEvents(final Long gameId) {
        findGame(gameId);
        return stealingRepository.findByGameIdOrderByIdAsc(gameId).stream()
            .map(StealingEventResponse::from)
            .toList();
    }

    @Transactional
    public AtBatResponse recordAtBat(final Long gameId, final RecordAtBatRequest req) {
        final Game game = findGame(gameId);
        final Player batter = playerRepository.findById(req.batterId())
            .orElseThrow(() -> new ResourceNotFoundException("Player", req.batterId()));

        final int sequence = atBatRepository.findMaxSequenceByGameId(gameId) + 1;
        final BaseState baseStateAfter = req.baseStateAfter() != null
            ? new BaseState(req.baseStateAfter().first(), req.baseStateAfter().second(), req.baseStateAfter().third())
            : BaseState.empty();

        final int runsScored = req.runsScored() != null ? req.runsScored() : 0;
        final int rbi = req.rbi() != null ? req.rbi() : 0;

        final AtBat atBat = new AtBat(
            game, batter, sequence, req.inning(), req.result(),
            baseStateAfter, runsScored, rbi, currentUser()
        );

        final AtBat saved = atBatRepository.save(atBat);
        return AtBatResponse.from(saved);
    }

    @Transactional
    public void undoLastAtBat(final Long gameId) {
        findGame(gameId);
        atBatRepository.findLastByGameId(gameId)
            .ifPresent(last -> atBatRepository.deleteById(last.getId()));
    }

    /** Löscht alle AtBats + Stealing-Events für dieses Spiel — komplettes Reset. */
    @Transactional
    public void resetScoring(final Long gameId) {
        findGame(gameId);
        final List<AtBat> atBats = atBatRepository.findByGameIdOrderBySequenceAsc(gameId);
        for (final AtBat a : atBats) atBatRepository.deleteById(a.getId());
        final List<BaseRunningEvent> events = stealingRepository.findByGameIdOrderByIdAsc(gameId);
        for (final BaseRunningEvent e : events) stealingRepository.deleteById(e.getId());
    }

    /**
     * Aktualisiert den BaseState des letzten AtBats (für Runner-Korrektur post-AtBat).
     * Runs/RBI werden überschrieben wenn übergeben.
     */
    @Transactional
    public AtBatResponse updateLastBaseState(final Long gameId,
                                              final Long first, final Long second, final Long third,
                                              final Integer runsScored, final Integer rbi) {
        findGame(gameId);
        final AtBat last = atBatRepository.findLastByGameId(gameId)
            .orElseThrow(() -> new ResourceNotFoundException("Kein AtBat vorhanden für Spiel " + gameId));
        last.setBaseStateAfter(new BaseState(first, second, third));
        if (runsScored != null) last.setRunsScored(runsScored);
        if (rbi != null) last.setRbi(rbi);
        final AtBat saved = atBatRepository.save(last);
        return AtBatResponse.from(saved);
    }

    @Transactional
    public StealingEventResponse recordStealingEvent(final Long gameId, final RecordStealingEventRequest req) {
        final Game game = findGame(gameId);
        final Player runner = playerRepository.findById(req.runnerId())
            .orElseThrow(() -> new ResourceNotFoundException("Player", req.runnerId()));

        final BaseRunningEvent event = new BaseRunningEvent(game, runner, req.inning(), req.type());
        final BaseRunningEvent saved = stealingRepository.save(event);
        return StealingEventResponse.from(saved);
    }

    @Transactional
    public void deleteStealingEvent(final Long gameId, final Long eventId) {
        findGame(gameId);
        stealingRepository.deleteById(eventId);
    }

    @Transactional(readOnly = true)
    public ScoreboardResponse getScoreboard(final Long gameId) {
        final Game game = findGame(gameId);
        final List<AtBat> atBats = atBatRepository.findByGameIdOrderBySequenceAsc(gameId);
        final List<BaseRunningEvent> stealingEvents = stealingRepository.findByGameIdOrderByIdAsc(gameId);
        final List<LineupEntry> lineup = lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(gameId);

        int scoreUs = atBats.stream().mapToInt(a -> a.getRunsScored() != null ? a.getRunsScored() : 0).sum();
        final Integer scoreThem = game.getScoreThem();

        final AtBat last = atBats.isEmpty() ? null : atBats.get(atBats.size() - 1);
        final int currentInning = last != null ? last.getInning() : 1;

        final int outsInCurrent = (int) atBats.stream()
            .filter(a -> a.getInning() != null && a.getInning() == currentInning)
            .filter(a -> a.getResult() != null && a.getResult().isOut())
            .count();

        BaseState state = last != null && last.getBaseStateAfter() != null
            ? last.getBaseStateAfter()
            : BaseState.empty();

        // Fold in stealing events die NACH dem letzten AtBat passiert sind
        if (last != null) {
            for (final BaseRunningEvent e : stealingEvents) {
                if (e.getCreatedAt() == null || last.getCreatedAt() == null) continue;
                if (!e.getCreatedAt().isAfter(last.getCreatedAt())) continue;
                if (e.getRunner() == null) continue;
                final Long runnerId = e.getRunner().getId();
                if (e.getType() == BaseRunningEventType.STOLEN_BASE) {
                    if (runnerId.equals(state.first())) {
                        state = new BaseState(null, runnerId, state.third());
                    } else if (runnerId.equals(state.second())) {
                        state = new BaseState(state.first(), null, runnerId);
                    } else if (runnerId.equals(state.third())) {
                        // Steal of home
                        state = new BaseState(state.first(), state.second(), null);
                        scoreUs += 1;
                    }
                } else if (e.getType() == BaseRunningEventType.CAUGHT_STEALING) {
                    if (runnerId.equals(state.first())) {
                        state = new BaseState(null, state.second(), state.third());
                    } else if (runnerId.equals(state.second())) {
                        state = new BaseState(state.first(), null, state.third());
                    } else if (runnerId.equals(state.third())) {
                        state = new BaseState(state.first(), state.second(), null);
                    }
                }
            }
        }

        final Map<Long, Player> playerMap = buildPlayerMap(state, lineup);

        final List<ScoreboardResponse.RunnerOnBase> runners = new ArrayList<>();
        addRunner(runners, 1, state.first(), playerMap, lineup);
        addRunner(runners, 2, state.second(), playerMap, lineup);
        addRunner(runners, 3, state.third(), playerMap, lineup);

        final Optional<LineupEntry> currentBatter = resolveCurrentBatter(last, lineup);

        return new ScoreboardResponse(
            gameId,
            scoreUs,
            scoreThem,
            currentInning,
            outsInCurrent,
            new AtBatResponse.BaseStateDto(state.first(), state.second(), state.third()),
            runners,
            currentBatter.map(e -> e.getPlayer().getId()).orElse(null),
            currentBatter.map(e -> e.getPlayer().getName()).orElse(null),
            currentBatter.map(LineupEntry::getBattingOrder).orElse(null),
            atBats.size()
        );
    }

    private void addRunner(final List<ScoreboardResponse.RunnerOnBase> out,
                           final int base, final Long playerId,
                           final Map<Long, Player> playerMap,
                           final List<LineupEntry> lineup) {
        if (playerId == null) return;
        final Player p = playerMap.get(playerId);
        final Integer order = lineup.stream()
            .filter(e -> e.getPlayer() != null && e.getPlayer().getId().equals(playerId))
            .map(LineupEntry::getBattingOrder)
            .findFirst().orElse(null);
        out.add(new ScoreboardResponse.RunnerOnBase(base, playerId, p != null ? p.getName() : null, order));
    }

    private Map<Long, Player> buildPlayerMap(final BaseState state, final List<LineupEntry> lineup) {
        final List<Long> ids = new ArrayList<>();
        if (state.first() != null) ids.add(state.first());
        if (state.second() != null) ids.add(state.second());
        if (state.third() != null) ids.add(state.third());
        for (final LineupEntry e : lineup) if (e.getPlayer() != null) ids.add(e.getPlayer().getId());
        if (ids.isEmpty()) return Map.of();
        return playerRepository.findAllById(ids).stream()
            .collect(Collectors.toMap(Player::getId, p -> p, (a, b) -> a));
    }

    /** Nächster Batter: nach letztem Batter in der Batting Order. Wenn keine AtBats: #1. */
    private Optional<LineupEntry> resolveCurrentBatter(final AtBat lastAtBat, final List<LineupEntry> lineup) {
        if (lineup.isEmpty()) return Optional.empty();
        final List<LineupEntry> sorted = lineup.stream()
            .filter(e -> e.getBattingOrder() != null)
            .sorted(Comparator.comparingInt(LineupEntry::getBattingOrder))
            .toList();
        if (sorted.isEmpty()) return Optional.empty();
        if (lastAtBat == null || lastAtBat.getBatter() == null) return Optional.of(sorted.get(0));

        final Long lastBatterId = lastAtBat.getBatter().getId();
        int lastIdx = -1;
        for (int i = 0; i < sorted.size(); i++) {
            if (sorted.get(i).getPlayer() != null && sorted.get(i).getPlayer().getId().equals(lastBatterId)) {
                lastIdx = i;
                break;
            }
        }
        if (lastIdx == -1) return Optional.of(sorted.get(0));
        final int nextIdx = (lastIdx + 1) % sorted.size();
        return Optional.of(sorted.get(nextIdx));
    }

    private Game findGame(final Long id) {
        return gameRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Game", id));
    }

    private static String currentUser() {
        final Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getName() != null ? auth.getName() : "unknown";
    }
}
