package com.softball.domain.port.out;

import com.softball.domain.model.Season;
import java.util.List;
import java.util.Optional;

public interface SeasonRepository {
    List<Season> findAll();
    Optional<Season> findById(Long id);
    Season save(Season season);
    void deleteById(Long id);
    boolean existsById(Long id);
    Optional<Season> findByIdWithGameDaysAndGames(Long id);
}
