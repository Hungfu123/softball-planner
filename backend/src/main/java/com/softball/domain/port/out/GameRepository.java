package com.softball.domain.port.out;

import com.softball.domain.model.Game;
import java.util.List;
import java.util.Optional;

public interface GameRepository {
    Optional<Game> findById(Long id);
    Game save(Game game);
    List<Game> saveAll(List<Game> games);
    List<Game> findByGameDayIdOrderByGameNumberAsc(Long gameDayId);
    List<Game> findByOpponentTeamId(Long teamId);
    List<Game> findAllWithOpponent();
    List<Game> findBySeasonIdWithScores(Long seasonId);
    void flush();
}
