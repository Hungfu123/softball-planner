package com.softball.application;

import com.softball.adapter.dto.AtBatResponse;
import com.softball.adapter.dto.RecordAtBatRequest;
import com.softball.adapter.dto.RecordStealingEventRequest;
import com.softball.adapter.dto.ScoreboardResponse;
import com.softball.adapter.dto.StealingEventResponse;
import com.softball.domain.model.*;
import com.softball.domain.port.out.*;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger log = LoggerFactory.getLogger(GameScoringService.class);

    private final GameRepository gameRepository;
    private final PlayerRepository playerRepository;
    private final LineupEntryRepository lineupEntryRepository;
    private final AtBatRepository atBatRepository;
    private final BaseRunningEventRepository stealingRepository;
    private final SubstitutionRepository substitutionRepository;
    private final com.softball.domain.port.out.InningAdvanceEventRepository inningAdvanceEventRepository;

    public GameScoringService(final GameRepository gameRepository,
                               final PlayerRepository playerRepository,
                               final LineupEntryRepository lineupEntryRepository,
                               final AtBatRepository atBatRepository,
                               final BaseRunningEventRepository stealingRepository,
                               final SubstitutionRepository substitutionRepository,
                               final com.softball.domain.port.out.InningAdvanceEventRepository inningAdvanceEventRepository) {
        this.gameRepository = gameRepository;
        this.playerRepository = playerRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.atBatRepository = atBatRepository;
        this.stealingRepository = stealingRepository;
        this.substitutionRepository = substitutionRepository;
        this.inningAdvanceEventRepository = inningAdvanceEventRepository;
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

    @Transactional
    public com.softball.adapter.dto.UndoResultResponse undoLastAction(final Long gameId) {
        findGame(gameId);

        final java.util.Optional<AtBat> lastABOpt = atBatRepository.findLastByGameId(gameId);
        final java.util.List<BaseRunningEvent> allStealings = stealingRepository.findByGameIdOrderByIdAsc(gameId);
        final java.util.List<Substitution> allSubs = substitutionRepository.findByGameId(gameId);
        final java.util.List<InningAdvanceEvent> allInningEvents = inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(gameId);

        final java.time.Instant newestAB = lastABOpt.map(AtBat::getCreatedAt).orElse(null);
        final java.time.Instant newestStealing = allStealings.stream()
            .map(BaseRunningEvent::getCreatedAt)
            .filter(java.util.Objects::nonNull)
            .max(java.time.Instant::compareTo)
            .orElse(null);
        final java.time.Instant newestSub = allSubs.stream()
            .map(Substitution::getCreatedAt)
            .filter(java.util.Objects::nonNull)
            .max(java.time.Instant::compareTo)
            .orElse(null);
        final java.time.Instant newestEvent = allInningEvents.stream()
            .map(InningAdvanceEvent::getCreatedAt)
            .filter(java.util.Objects::nonNull)
            .max(java.time.Instant::compareTo)
            .orElse(null);

        if (newestAB == null && newestStealing == null && newestSub == null && newestEvent == null) {
            return com.softball.adapter.dto.UndoResultResponse.none();
        }

        final boolean abIsNewest = newestAB != null
            && (newestStealing == null || !newestStealing.isAfter(newestAB))
            && (newestSub == null || !newestSub.isAfter(newestAB))
            && (newestEvent == null || !newestEvent.isAfter(newestAB));

        if (abIsNewest) {
            final AtBat lastAB = lastABOpt.get();
            final java.time.Instant cutoff = atBatRepository.findByGameIdOrderBySequenceAsc(gameId).stream()
                .filter(ab -> !ab.getId().equals(lastAB.getId()))
                .map(AtBat::getCreatedAt)
                .filter(java.util.Objects::nonNull)
                .max(java.time.Instant::compareTo)
                .orElse(java.time.Instant.EPOCH);
            final java.util.List<BaseRunningEvent> stale = allStealings.stream()
                .filter(e -> e.getCreatedAt() != null && e.getCreatedAt().isAfter(cutoff))
                .toList();
            for (final BaseRunningEvent e : stale) {
                stealingRepository.deleteById(e.getId());
            }
            atBatRepository.deleteById(lastAB.getId());
            return com.softball.adapter.dto.UndoResultResponse.atBat(lastAB.getId());
        }

        final boolean stealingIsNewest = newestStealing != null
            && (newestSub == null || !newestSub.isAfter(newestStealing))
            && (newestEvent == null || !newestEvent.isAfter(newestStealing));

        if (stealingIsNewest) {
            final BaseRunningEvent latest = allStealings.stream()
                .filter(e -> e.getCreatedAt() != null)
                .max(java.util.Comparator.comparing(BaseRunningEvent::getCreatedAt))
                .orElseThrow();
            stealingRepository.deleteById(latest.getId());
            return com.softball.adapter.dto.UndoResultResponse.stealing(latest.getId());
        }

        final boolean subIsNewest = newestSub != null
            && (newestEvent == null || !newestEvent.isAfter(newestSub));

        if (subIsNewest) {
            final Substitution latest = allSubs.stream()
                .filter(s -> s.getCreatedAt() != null)
                .max(java.util.Comparator.comparing(Substitution::getCreatedAt))
                .orElseThrow();
            substitutionRepository.deleteById(latest.getId());
            return com.softball.adapter.dto.UndoResultResponse.substitution(latest.getId());
        }

        if (newestEvent != null) {
            final InningAdvanceEvent latest = allInningEvents.stream()
                .filter(e -> e.getCreatedAt() != null)
                .max(java.util.Comparator.comparing(InningAdvanceEvent::getCreatedAt))
                .orElseThrow();
            final int runs = latest.getOpponentRuns() != null ? latest.getOpponentRuns() : 0;
            if (runs > 0) {
                final Game gameForRevert = findGame(gameId);
                final int newScore = Math.max(0, (gameForRevert.getScoreThem() != null ? gameForRevert.getScoreThem() : 0) - runs);
                gameForRevert.setScoreThem(newScore);
                gameRepository.save(gameForRevert);
            }
            inningAdvanceEventRepository.deleteById(latest.getId());
            return com.softball.adapter.dto.UndoResultResponse.inningAdvance(latest.getId());
        }

        return com.softball.adapter.dto.UndoResultResponse.none();
    }

    @Transactional
    public com.softball.adapter.dto.InningAdvanceEventResponse advanceInning(final Long gameId, final int opponentRuns) {
        if (opponentRuns < 0) {
            throw new com.softball.shared.exception.BusinessValidationException("opponentRuns darf nicht negativ sein");
        }
        final Game game = findGame(gameId);

        // Aktuelles Inning aus letztem AB + letztem Event (max).
        final int lastABInning = atBatRepository.findByGameIdOrderBySequenceAsc(gameId).stream()
            .mapToInt(a -> a.getInning() != null ? a.getInning() : 1)
            .max().orElse(1);
        final int lastEventInning = inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(gameId).stream()
            .mapToInt(e -> e.getToInning() != null ? e.getToInning() : 1)
            .max().orElse(1);
        final int currentInning = Math.max(lastABInning, lastEventInning);
        final int toInning = currentInning + 1;

        final InningAdvanceEvent event = new InningAdvanceEvent(game, toInning, opponentRuns, currentUser());
        final InningAdvanceEvent saved = inningAdvanceEventRepository.save(event);

        game.setScoreThem((game.getScoreThem() != null ? game.getScoreThem() : 0) + opponentRuns);
        gameRepository.save(game);

        return com.softball.adapter.dto.InningAdvanceEventResponse.from(saved);
    }

    /** Löscht alle AtBats + Stealing-Events + Score für dieses Spiel — komplettes Reset. */
    @Transactional
    public void resetScoring(final Long gameId) {
        final Game game = findGame(gameId);
        final List<AtBat> atBats = atBatRepository.findByGameIdOrderBySequenceAsc(gameId);
        for (final AtBat a : atBats) atBatRepository.deleteById(a.getId());
        final List<BaseRunningEvent> events = stealingRepository.findByGameIdOrderByIdAsc(gameId);
        for (final BaseRunningEvent e : events) stealingRepository.deleteById(e.getId());
        final java.util.List<InningAdvanceEvent> inningEvents = inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(gameId);
        for (final InningAdvanceEvent ev : inningEvents) inningAdvanceEventRepository.deleteById(ev.getId());
        // Score auch zurücksetzen (damit die im Scoreboard korrekt bei 0 startet)
        game.setScoreUs(0);
        game.setScoreThem(0);
        // Batting-Side zurücksetzen — User wählt nach Reset neu
        game.setBattingSide(null);
        // Game-End-Marker zurücksetzen — Reset = "alles auf Anfang"
        game.setEndedAt(null);
        // Game neu speichern — geht über GameService, aber direkt über Repo einfacher: wir nutzen JPA dirty-tracking nicht für Domain-Objekte, also setGameScore via GameRepository
        // Minimal-Invasiv: wir mapen auf Entity und speichern nichts, stattdessen setzen wir via Score-Endpoint-Helper
        // Simplest: nutze setGameScore wenn vorhanden. Wir nutzen gameRepository.save.
        gameRepository.save(game);
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

        // Defense-in-Depth: prüfe ob Runner zu diesem Game gehört (Lineup oder eingewechselt).
        // Keine BaseState-Validation (zu fragil) — nur Log-Warn als Diagnostik.
        final List<LineupEntry> lineup = lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(gameId);
        final List<Substitution> subs = substitutionRepository.findByGameId(gameId);
        final boolean inLineup = lineup.stream().anyMatch(e -> e.getPlayer() != null && req.runnerId().equals(e.getPlayer().getId()));
        final boolean inSubs = subs.stream().anyMatch(s -> s.getPlayerIn() != null && req.runnerId().equals(s.getPlayerIn().getId()));
        if (!inLineup && !inSubs) {
            log.warn("Stealing-Event mit Runner nicht im Game-Lineup: gameId={}, runnerId={}, type={}, inning={}",
                gameId, req.runnerId(), req.type(), req.inning());
        }

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
        final int lastABInning = last != null && last.getInning() != null ? last.getInning() : 1;
        final int lastEventInning = inningAdvanceEventRepository.findByGameIdOrderByCreatedAtAsc(gameId).stream()
            .mapToInt(e -> e.getToInning() != null ? e.getToInning() : 1)
            .max().orElse(1);
        final int currentInning = Math.max(lastABInning, lastEventInning);

        final int atBatOuts = (int) atBats.stream()
            .filter(a -> a.getInning() != null && a.getInning() == currentInning)
            .filter(a -> a.getResult() != null && a.getResult().isOut())
            .count();
        // Runner-Outs zählen für den Inning-Counter:
        //   CAUGHT_STEALING → beim Klau-Versuch erwischt
        //   OUT_ON_PLAY     → bei Grounder/Fly-Out ausgespielt (z.B. Double-Play, Force-Out)
        final int runnerOuts = (int) stealingEvents.stream()
            .filter(e -> e.getType() == BaseRunningEventType.CAUGHT_STEALING
                      || e.getType() == BaseRunningEventType.OUT_ON_PLAY)
            .filter(e -> e.getInning() != null && e.getInning() == currentInning)
            .count();
        final int outsInCurrent = atBatOuts + runnerOuts;

        BaseState state = last != null && last.getBaseStateAfter() != null
            ? last.getBaseStateAfter()
            : BaseState.empty();

        // Fold in stealing events die NACH dem letzten AtBat passiert sind.
        // Kaskaden-Logik: Wenn Ziel-Base besetzt ist, advanced der bestehende Runner
        // automatisch eine Base weiter (Double-Steal). Ist dann 3B auch besetzt, scort
        // der 3B-Runner Home.
        if (last != null) {
            for (final BaseRunningEvent e : stealingEvents) {
                if (e.getCreatedAt() == null || last.getCreatedAt() == null) continue;
                if (e.getCreatedAt().isBefore(last.getCreatedAt())) continue;
                if (e.getRunner() == null) continue;
                final Long runnerId = e.getRunner().getId();
                if (e.getType() == BaseRunningEventType.STOLEN_BASE) {
                    if (runnerId.equals(state.first())) {
                        // Runner 1B → 2B. Kaskade wenn 2B besetzt
                        Long on2B = state.second();
                        Long on3B = state.third();
                        Long newThird = on3B;
                        if (on2B != null) {
                            // 2B-Runner läuft mit auf 3B
                            if (on3B != null) {
                                // 3B-Runner scort Home
                                scoreUs += 1;
                            }
                            newThird = on2B;
                        }
                        state = new BaseState(null, runnerId, newThird);
                    } else if (runnerId.equals(state.second())) {
                        // Runner 2B → 3B. Kaskade wenn 3B besetzt (dieser scort)
                        Long on3B = state.third();
                        if (on3B != null) {
                            scoreUs += 1; // 3B scort
                        }
                        state = new BaseState(state.first(), null, runnerId);
                    } else if (runnerId.equals(state.third())) {
                        // Steal of home — Runner scort
                        state = new BaseState(state.first(), state.second(), null);
                        scoreUs += 1;
                    }
                } else if (e.getType() == BaseRunningEventType.CAUGHT_STEALING
                        || e.getType() == BaseRunningEventType.OUT_ON_PLAY) {
                    // Beide: Runner verschwindet von Base (keine Punkte)
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

        // Subs werden auf den Batting-Slot angewendet — DH + Player-Wechsel
        final List<Substitution> substitutions = substitutionRepository.findByGameId(gameId);
        final Optional<LineupEntry> currentBatterEntry = resolveCurrentBatter(last, lineup, substitutions);
        final Optional<Player> currentBatter = currentBatterEntry.map(e ->
            resolveBatterForEntry(e, substitutions, currentInning));

        return new ScoreboardResponse(
            gameId,
            scoreUs,
            scoreThem,
            currentInning,
            outsInCurrent,
            new AtBatResponse.BaseStateDto(state.first(), state.second(), state.third()),
            runners,
            currentBatter.map(Player::getId).orElse(null),
            currentBatter.map(Player::getName).orElse(null),
            currentBatterEntry.map(LineupEntry::getBattingOrder).orElse(null),
            atBats.size()
        );
    }

    /**
     * Ermittelt den effektiven Batter für einen Lineup-Slot unter Berücksichtigung von:
     *   1. DH — wenn entry.dhBatterPlayer gesetzt ist, batted der DH (nicht der Field-Player)
     *   2. Substitutions — zuletzt gegen playerIn ausgetauscht (Kaskade möglich)
     */
    private Player resolveBatterForEntry(final LineupEntry entry,
                                          final List<Substitution> substitutions,
                                          final int currentInning) {
        Player current = entry.getDhBatterPlayer() != null
            ? entry.getDhBatterPlayer()
            : entry.getPlayer();
        if (current == null) return null;

        // Substitutions in Inning-Reihenfolge durchlaufen (ältere zuerst),
        // um Kaskaden korrekt abzubilden: A → B → C.
        final List<Substitution> sortedSubs = substitutions.stream()
            .filter(s -> s.getInning() != null && s.getInning() <= currentInning)
            .sorted(Comparator.comparing(Substitution::getInning)
                .thenComparing(s -> s.getId() != null ? s.getId() : 0L))
            .toList();
        for (final Substitution sub : sortedSubs) {
            if (sub.getPlayerOut() != null
                    && sub.getPlayerOut().getId().equals(current.getId())
                    && sub.getPlayerIn() != null) {
                current = sub.getPlayerIn();
            }
        }
        return current;
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

    /**
     * Nächster Batter: nach letztem Batter in der Batting Order.
     * Nutzt den effektiven Batter pro Slot (DH + Substitutions), damit wir
     * den richtigen Lineup-Slot zuordnen können wenn der DH oder eingewechselte
     * Spieler gebattet haben.
     */
    private Optional<LineupEntry> resolveCurrentBatter(final AtBat lastAtBat,
                                                        final List<LineupEntry> lineup,
                                                        final List<Substitution> substitutions) {
        if (lineup.isEmpty()) return Optional.empty();
        final List<LineupEntry> sorted = lineup.stream()
            .filter(e -> e.getBattingOrder() != null)
            .sorted(Comparator.comparingInt(LineupEntry::getBattingOrder))
            .toList();
        if (sorted.isEmpty()) return Optional.empty();
        if (lastAtBat == null || lastAtBat.getBatter() == null) return Optional.of(sorted.get(0));

        final Long lastBatterId = lastAtBat.getBatter().getId();
        final int atBatInning = lastAtBat.getInning() != null ? lastAtBat.getInning() : 1;
        int lastIdx = -1;
        for (int i = 0; i < sorted.size(); i++) {
            final Player effective = resolveBatterForEntry(sorted.get(i), substitutions, atBatInning);
            if (effective != null && effective.getId().equals(lastBatterId)) {
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
