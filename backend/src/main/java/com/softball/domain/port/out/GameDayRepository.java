package com.softball.domain.port.out;

import com.softball.domain.model.GameDay;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface GameDayRepository {
    List<GameDay> findBySeasonIdOrderByDateAsc(Long seasonId);
    Optional<GameDay> findById(Long id);
    Optional<GameDay> findByIdWithPlayers(Long id);
    Optional<GameDay> findByIdWithGames(Long id);
    Optional<GameDay> findByIdWithGamesAndPlayers(Long id);
    GameDay save(GameDay gameDay);
    void deleteById(Long id);
    boolean existsBySeasonAndDate(Long seasonId, LocalDate date);
    boolean existsById(Long id);
}
