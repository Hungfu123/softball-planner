package com.softball.application;

import com.softball.adapter.dto.OpponentBattingStatsResponse;
import com.softball.adapter.dto.TeamDirectoryEntry;
import com.softball.adapter.dto.TeamLeagueOccurrence;
import com.softball.domain.model.Game;
import com.softball.domain.model.LeagueTeam;
import com.softball.domain.model.Season;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.domain.port.out.AtBatRepository;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.LeagueTeamRepository;
import com.softball.domain.port.out.SeasonRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Team-Verzeichnis: alle Gegner des Vereins über alle Ligen/Saisons hinweg,
 * fusioniert nach Club-Namen (analog zur Gegner-Statistik) — mit Liga-Anwesenheiten,
 * Bilanz gegen uns (W-L-T, Runs) und Team-AVG. Heimat des "Teams pflegen"-Features.
 */
@Service
public class TeamDirectoryService {

    private static final Logger log = LoggerFactory.getLogger(TeamDirectoryService.class);

    private final LeagueTeamRepository leagueTeamRepository;
    private final GameRepository gameRepository;
    private final SeasonRepository seasonRepository;
    private final AtBatRepository atBatRepository;
    private final GameScoringService gameScoringService;
    private final BattingStatsService battingStatsService;

    public TeamDirectoryService(final LeagueTeamRepository leagueTeamRepository,
                                final GameRepository gameRepository,
                                final SeasonRepository seasonRepository,
                                final AtBatRepository atBatRepository,
                                final GameScoringService gameScoringService,
                                final BattingStatsService battingStatsService) {
        this.leagueTeamRepository = leagueTeamRepository;
        this.gameRepository = gameRepository;
        this.seasonRepository = seasonRepository;
        this.atBatRepository = atBatRepository;
        this.gameScoringService = gameScoringService;
        this.battingStatsService = battingStatsService;
    }

    @Transactional(readOnly = true)
    public List<TeamDirectoryEntry> getDirectory() {
        final Map<Long, Season> seasonById = seasonRepository.findAll().stream()
            .collect(Collectors.toMap(Season::getId, s -> s));

        // Club = getrimmter Name über alle Ligen; eigene Team-Zeilen gehören nicht ins Verzeichnis
        final Map<String, List<LeagueTeam>> teamsByClub = new HashMap<>();
        for (final LeagueTeam team : leagueTeamRepository.findAll()) {
            if (team.isOwnTeam()) continue;
            teamsByClub.computeIfAbsent(team.getName().trim(), k -> new ArrayList<>()).add(team);
        }

        // Bilanz pro Club aus den Spielen mit Gegner: W-L-T und Runs nur bei vollständigem Ergebnis.
        // Effektiver eigener Score wie überall in der App (GameDayResponse): Live-Score aus den
        // At-Bats, sobald das Spiel gescort wurde — sonst der manuell eingetragene DB-Score.
        final List<Game> gamesWithOpponent = gameRepository.findAllWithOpponent();
        final List<Long> gameIds = gamesWithOpponent.stream()
            .map(Game::getId).filter(Objects::nonNull).toList();
        final Map<Long, Long> atBatCounts = atBatRepository.countByGameIds(gameIds);
        final Map<Long, Integer> liveScores = gameScoringService.computeLiveScoreUsByGameIds(gameIds);

        final Map<String, int[]> recordByClub = new HashMap<>(); // [games, wins, losses, ties, runsFor, runsAgainst]
        for (final Game game : gamesWithOpponent) {
            final String club = game.getOpponentTeam().getName().trim();
            final int[] r = recordByClub.computeIfAbsent(club, k -> new int[6]);
            r[0]++;
            final boolean scored = atBatCounts.getOrDefault(game.getId(), 0L) > 0;
            final Integer us = scored ? liveScores.get(game.getId()) : game.getScoreUs();
            final Integer them = game.getScoreThem();
            if (us != null && them != null) {
                if (us > them) r[1]++;
                else if (us < them) r[2]++;
                else r[3]++;
                r[4] += us;
                r[5] += them;
            }
        }

        // Team-AVG pro Club aus der bestehenden Gegner-Aggregation (eine Quelle, keine Duplikation)
        final Map<String, OpponentBattingStatsResponse> battingByClub =
            battingStatsService.getOpponentBattingOverview().stream()
                .collect(Collectors.toMap(OpponentBattingStatsResponse::teamName, o -> o));

        final List<TeamDirectoryEntry> result = new ArrayList<>(teamsByClub.size());
        for (final var entry : teamsByClub.entrySet()) {
            final String club = entry.getKey();
            final List<TeamLeagueOccurrence> leagues = entry.getValue().stream()
                .map(t -> {
                    final Season season = seasonById.get(t.getSeasonId());
                    final String leagueName = season != null ? season.getName() : "—";
                    final Integer year = season != null ? season.getYear() : null;
                    return new TeamLeagueOccurrence(t.getId(), leagueName, year);
                })
                .sorted(Comparator.comparing(TeamLeagueOccurrence::leagueName)
                    .thenComparing(o -> o.year() == null ? 0 : o.year()))
                .toList();

            final int[] r = recordByClub.getOrDefault(club, new int[6]);
            final OpponentBattingStatsResponse batting = battingByClub.get(club);
            result.add(new TeamDirectoryEntry(
                club,
                leagues,
                r[0], r[1], r[2], r[3], r[4], r[5],
                batting != null ? batting.battingAverage() : null));
        }
        result.sort(Comparator.comparing(TeamDirectoryEntry::clubName, String.CASE_INSENSITIVE_ORDER));
        return result;
    }

    /**
     * Club-Umbenennung: benennt ALLE Liga-Zeilen dieses Clubs um (gleiche Fusions-Semantik
     * wie Verzeichnis und Gegner-Statistik). Tippfehler-Varianten lassen sich so in einem
     * Schritt zusammenführen.
     */
    @Transactional
    public void renameClub(final String currentName, final String newName) {
        final String trimmedCurrent = currentName == null ? "" : currentName.trim();
        final String trimmedNew = newName == null ? "" : newName.trim();
        if (trimmedNew.isEmpty()) {
            throw new BusinessValidationException("Der neue Name darf nicht leer sein.");
        }
        final List<LeagueTeam> teams = leagueTeamRepository.findAll().stream()
            .filter(t -> !t.isOwnTeam() && t.getName().trim().equalsIgnoreCase(trimmedCurrent))
            .toList();
        if (teams.isEmpty()) {
            throw new BusinessValidationException("Kein Team mit dem Namen '" + trimmedCurrent + "' gefunden.");
        }
        for (final LeagueTeam team : teams) {
            team.setName(trimmedNew);
            leagueTeamRepository.save(team);
        }
        log.info("Club '{}' zu '{}' umbenannt ({} Liga-Zeilen)", trimmedCurrent, trimmedNew, teams.size());
    }
}
