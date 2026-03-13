package com.softball.application;

import com.softball.domain.model.Player;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.PlayerRepository;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PlayerService {

    private final PlayerRepository playerRepository;

    public PlayerService(final PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }

    @Transactional(readOnly = true)
    public List<Player> findAll() {
        return playerRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Player findById(final Long id) {
        return playerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Player", id));
    }

    public Player create(final String name) {
        return playerRepository.save(new Player(name));
    }

    public Player update(final Long id, final String name, final Boolean regular) {
        final Player player = findById(id);
        if (name != null && !name.isBlank()) {
            player.setName(name);
        }
        if (regular != null) {
            player.setRegular(regular);
        }
        return playerRepository.save(player);
    }

    public void delete(final Long id) {
        if (!playerRepository.existsById(id)) {
            throw new ResourceNotFoundException("Player", id);
        }
        playerRepository.deleteById(id);
    }
}
