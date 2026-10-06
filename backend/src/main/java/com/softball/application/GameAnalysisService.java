package com.softball.application;

import com.softball.adapter.dto.BattingSlotStatsResponse;
import com.softball.adapter.dto.TeamGameLogResponse;
import com.softball.domain.model.AtBat;
import com.softball.domain.model.Game;
import com.softball.domain.model.LineupEntry;
import com.softball.domain.model.Player;
import com.softball.domain.model.TeamGameLog;
import com.softball.domain.port.out.AtBatRepository;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.LineupEntryRepository;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.service.TeamGameLogCalculator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Team-Analyse über die eigene Offensiv-Historie: Spiel-für-Spiel-Verlauf ("Game Log")
 * mit Inning-Aufschlüsselung, Left-on-Base und Walks — die Datenbasis für die Frage
 * "hat unser Lineup funktioniert?". Quelle ist ausschließlich das Old-Scoring
 * (At-Bats); Spielbogen-Daten fließen bewusst nicht ein (docs/STATS.md) — solche
 * Spiele erscheinen mit Endstand, aber als "nicht ausgewertet" gekennzeichnet.
 */
@Service
public class GameAnalysisService {

    private static final TeamGameLogCalculator CALCULATOR = new TeamGameLogCalculator();

    private final GameRepository gameRepository;
    private final AtBatRepository atBatRepository;
    private final LineupEntryRepository lineupEntryRepository;
    private final PlayerRepository playerRepository;
    private final GameScoringService gameScoringService;

    public GameAnalysisService(final GameRepository gameRepository,
                               final AtBatRepository atBatRepository,
                               final LineupEntryRepository lineupEntryRepository,
                               final PlayerRepository playerRepository,
                               final GameScoringService gameScoringService) {
        this.gameRepository = gameRepository;
        this.atBatRepository = atBatRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.playerRepository = playerRepository;
        this.gameScoringService = gameScoringService;
    }

    /**
     * Alle gespielten Spiele (At-Bat-Daten oder eingetragener Endstand), neueste zuerst,
     * mit Team-Offensiv-Zahlen, Inning-Verlauf und gestrandeten Runnern.
     */
    @Transactional(readOnly = true)
    public List<TeamGameLogResponse> getTeamGameLogs() {
        final List<Game> allGames = gameRepository.findAllWithOpponent();
        final List<Long> allIds = allGames.stream().map(Game::getId).filter(Objects::nonNull).toList();
        final Map<Long, Long> atBatCounts = atBatRepository.countByGameIds(allIds);

        final List<Game> playedGames = allGames.stream()
            .filter(g -> atBatCounts.getOrDefault(g.getId(), 0L) > 0
                || g.getScoreUs() != null || g.getScoreThem() != null)
            .toList();
        if (playedGames.isEmpty()) return List.of();

        final List<Long> playedIds = playedGames.stream().map(Game::getId).filter(Objects::nonNull).toList();
        final List<AtBat> atBats = atBatRepository.findByGameIdInOrderBySequenceAsc(playedIds);
        final Map<Long, Integer> liveScores = gameScoringService.computeLiveScoreUsByGameIds(playedIds);
        final Map<Long, String> playerNames = playerNames();

        return CALCULATOR.calculateGameLogs(playedGames, atBats, liveScores, playerNames).stream()
            .map(TeamGameLogResponse::from)
            .toList();
    }

    /**
     * Was die Batting-Plätze 1..N über alle Spiele hinweg produziert haben —
     * unabhängig davon, wer dort stand. Runs pro Platz sind bewusst nicht dabei:
     * ein Hit an Platz 9, der die Bases räumt, zahlt aufs nächste Inning, nicht auf seinen Slot.
     */
    @Transactional(readOnly = true)
    public List<BattingSlotStatsResponse> getBattingSlots() {
        final List<AtBat> atBats = atBatRepository.findAll();
        if (atBats.isEmpty()) return List.of();

        final List<Long> gameIds = atBats.stream()
            .map(AtBat::getGame).filter(Objects::nonNull).map(Game::getId).filter(Objects::nonNull)
            .distinct().toList();
        final List<LineupEntry> lineups = lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(gameIds);

        return CALCULATOR.calculateBattingSlots(lineups, atBats).stream()
            .map(BattingSlotStatsResponse::from)
            .toList();
    }

    private Map<Long, String> playerNames() {
        final Map<Long, String> names = new HashMap<>();
        for (final Player p : playerRepository.findAll()) {
            if (p.getId() != null) names.put(p.getId(), p.getName());
        }
        return names;
    }
}
