package com.softball.domain.port.out;

import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.Spielbogen;

import java.util.List;
import java.util.Optional;

public interface SpielbogenRepository {
    List<Spielbogen> findAll();
    List<Spielbogen> findBySeasonId(Long seasonId);
    List<Spielbogen> findByStatus(BogenStatus status);
    Optional<Spielbogen> findById(Long id);
    Spielbogen save(Spielbogen bogen);
    void deleteById(Long id);
    boolean existsById(Long id);
    Optional<Spielbogen> findByPublicToken(String publicToken);
}
