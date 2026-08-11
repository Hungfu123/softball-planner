package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.mapper.GameMapper;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringLeagueTeamRepository;
import com.softball.domain.model.Game;
import com.softball.domain.port.out.GameRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class GameRepositoryAdapter implements GameRepository {

    private final SpringGameRepository repo;
    private final SpringLeagueTeamRepository leagueTeamRepo;
    private final GameMapper mapper;

    public GameRepositoryAdapter(final SpringGameRepository repo,
                                  final SpringLeagueTeamRepository leagueTeamRepo,
                                  final GameMapper mapper) {
        this.repo = repo;
        this.leagueTeamRepo = leagueTeamRepo;
        this.mapper = mapper;
    }

    @Override
    public Optional<Game> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Game save(final Game game) {
        // For game updates, load existing and update fields
        if (game.getId() != null) {
            var existing = repo.findById(game.getId()).orElse(null);
            if (existing != null) {
                existing.setGameNumber(game.getGameNumber());
                existing.setScoreUs(game.getScoreUs());
                existing.setScoreThem(game.getScoreThem());
                existing.setEndedAt(game.getEndedAt());
                existing.setBattingSide(game.getBattingSide());
                existing.setFirstBaseCoachRotation(game.getFirstBaseCoachRotation());
                existing.setThirdBaseCoachRotation(game.getThirdBaseCoachRotation());
                existing.setFirstBaseCoachRotationReversed(game.isFirstBaseCoachRotationReversed());
                existing.setThirdBaseCoachRotationReversed(game.isThirdBaseCoachRotationReversed());
                existing.setTimerRunningSince(game.getTimerRunningSince());
                existing.setTimerAccumulatedSeconds(game.getTimerAccumulatedSeconds());
                existing.setTimeLimitMinutes(game.getTimeLimitMinutes());
                existing.setTimerStartedAt(game.getTimerStartedAt());
                if (game.getOpponentTeam() != null && game.getOpponentTeam().getId() != null) {
                    existing.setOpponentTeam(leagueTeamRepo.getReferenceById(game.getOpponentTeam().getId()));
                } else {
                    existing.setOpponentTeam(null);
                }
                return mapper.toDomain(repo.save(existing));
            }
        }
        throw new IllegalStateException("Game save without ID not supported via adapter");
    }

    @Override
    public List<Game> saveAll(final List<Game> games) {
        return games.stream().map(this::save).toList();
    }

    @Override
    public List<Game> findByGameDayIdOrderByGameNumberAsc(final Long gameDayId) {
        return repo.findByGameDayIdOrderByGameNumberAsc(gameDayId).stream()
            .map(mapper::toDomain).toList();
    }

    @Override
    public List<Game> findByOpponentTeamId(final Long teamId) {
        return repo.findByOpponentTeam_Id(teamId).stream()
            .map(mapper::toDomain).toList();
    }

    @Override
    public List<Game> findBySeasonIdWithScores(final Long seasonId) {
        return repo.findBySeasonIdWithScores(seasonId).stream()
            .map(mapper::toDomain).toList();
    }

    @Override
    public void flush() {
        repo.flush();
    }
}
