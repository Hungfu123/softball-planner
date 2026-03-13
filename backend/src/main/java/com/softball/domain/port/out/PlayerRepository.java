package com.softball.domain.port.out;

import com.softball.domain.model.Player;
import java.util.List;
import java.util.Optional;

public interface PlayerRepository {
    List<Player> findAll();
    Optional<Player> findById(Long id);
    Player save(Player player);
    void deleteById(Long id);
    boolean existsById(Long id);
    List<Player> findByRegularTrue();
    List<Player> findAllById(Iterable<Long> ids);
}
