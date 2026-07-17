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

    @Transactional
    public Player setWhatsappName(final Long id, final String whatsappName) {
        final Player player = playerRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Player", id));
        final String normalized = (whatsappName == null || whatsappName.isBlank()) ? null : whatsappName.trim();
        player.setWhatsappName(normalized);
        return playerRepository.save(player);
    }

    @Transactional
    public List<Player> updateBattingOrder(final List<Long> orderedPlayerIds) {
        final List<Player> allPlayers = playerRepository.findAll();

        for (final Player player : allPlayers) {
            final int index = orderedPlayerIds.indexOf(player.getId());
            player.setDefaultBattingOrder(index >= 0 ? index + 1 : null);
        }

        for (final Player player : allPlayers) {
            playerRepository.save(player);
        }

        return allPlayers;
    }
}
