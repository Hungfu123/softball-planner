package com.softball.domain.port.out;

import com.softball.domain.model.Substitution;
import java.util.List;

public interface SubstitutionRepository {
    List<Substitution> findByGameId(Long gameId);
    List<Substitution> findByGameIdIn(List<Long> gameIds);
    void deleteByGameId(Long gameId);
    void deleteById(Long id);
    boolean existsByPlayerId(Long playerId);
    Substitution save(Substitution substitution);
}
