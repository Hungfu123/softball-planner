package com.softball.service;

import com.softball.entity.Player;
import com.softball.exception.ResourceNotFoundException;
import com.softball.repository.PlayerRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PlayerService {

    private final PlayerRepository playerRepository;

    public PlayerService(final PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }

    public List<Player> findAll() {
        return playerRepository.findAll();
    }

    public Player findById(final Long id) {
        return playerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Player", id));
    }

    public Player create(final String name) {
        return playerRepository.save(new Player(name));
    }

    public Player update(final Long id, final String name) {
        final Player player = findById(id);
        player.setName(name);
        return playerRepository.save(player);
    }

    public void delete(final Long id) {
        if (!playerRepository.existsById(id)) {
            throw new ResourceNotFoundException("Player", id);
        }
        playerRepository.deleteById(id);
    }
}
