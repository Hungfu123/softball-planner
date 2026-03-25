package com.softball.application;

import com.softball.adapter.dto.SubstitutionRequest;
import com.softball.adapter.dto.SubstitutionResponse;
import com.softball.domain.model.*;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.LineupEntryRepository;
import com.softball.domain.port.out.PlayerRepository;
import com.softball.domain.port.out.SubstitutionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class SubstitutionService {

    private final SubstitutionRepository substitutionRepository;
    private final LineupEntryRepository lineupEntryRepository;
    private final PlayerRepository playerRepository;
    private final GameRepository gameRepository;

    public SubstitutionService(final SubstitutionRepository substitutionRepository,
                                final LineupEntryRepository lineupEntryRepository,
                                final PlayerRepository playerRepository,
                                final GameRepository gameRepository) {
        this.substitutionRepository = substitutionRepository;
        this.lineupEntryRepository = lineupEntryRepository;
        this.playerRepository = playerRepository;
        this.gameRepository = gameRepository;
    }

    @Transactional(readOnly = true)
    public List<Substitution> getSubstitutions(final Long gameId) {
        return substitutionRepository.findByGameId(gameId);
    }

    @Transactional(readOnly = true)
    public Map<Long, List<SubstitutionResponse>> getSubstitutionsForGames(final List<Long> gameIds) {
        if (gameIds.isEmpty()) return Map.of();
        return substitutionRepository.findByGameIdIn(gameIds).stream()
            .collect(Collectors.groupingBy(
                s -> s.getGame().getId(),
                Collectors.mapping(SubstitutionResponse::from, Collectors.toList())
            ));
    }

    @Transactional
    public List<Substitution> setSubstitutions(final Long gameId, final List<SubstitutionRequest> requests) {
        final Game game = gameRepository.findById(gameId)
            .orElseThrow(() -> new ResourceNotFoundException("Game", gameId));

        validate(game, requests);

        substitutionRepository.deleteByGameId(gameId);

        final Set<Long> allPlayerIds = new LinkedHashSet<>();
        requests.forEach(req -> {
            allPlayerIds.add(req.playerOutId());
            allPlayerIds.add(req.playerInId());
        });
        final Map<Long, Player> playerMap = playerRepository.findAllById(allPlayerIds).stream()
            .collect(Collectors.toMap(Player::getId, Function.identity()));

        return requests.stream().map(req -> {
            final Player playerOut = playerMap.get(req.playerOutId());
            if (playerOut == null) throw new ResourceNotFoundException("Player", req.playerOutId());
            final Player playerIn = playerMap.get(req.playerInId());
            if (playerIn == null) throw new ResourceNotFoundException("Player", req.playerInId());

            final Substitution sub = new Substitution();
            sub.setGame(game);
            sub.setPlayerOut(playerOut);
            sub.setPlayerIn(playerIn);
            sub.setInning(req.inning());
            return substitutionRepository.save(sub);
        }).toList();
    }

    private void validate(final Game game, final List<SubstitutionRequest> requests) {
        if (requests.isEmpty()) return;

        final Set<Long> lineupPlayerIds = lineupEntryRepository.findByGameIdOrderByBattingOrderAsc(game.getId())
            .stream().map(e -> e.getPlayer().getId()).collect(Collectors.toSet());

        final Set<Long> availableIds = (game.getGameDay() != null && game.getGameDay().getAvailablePlayers() != null)
            ? game.getGameDay().getAvailablePlayers().stream().map(Player::getId).collect(Collectors.toSet())
            : Set.of();

        for (final SubstitutionRequest req : requests) {
            if (req.playerOutId().equals(req.playerInId())) {
                throw new BusinessValidationException("Spieler kann nicht mit sich selbst ausgewechselt werden");
            }
            if (!lineupPlayerIds.contains(req.playerOutId())) {
                throw new BusinessValidationException("Spieler (raus) muss im Lineup sein");
            }
            if (lineupPlayerIds.contains(req.playerInId())) {
                throw new BusinessValidationException("Einwechselspieler darf nicht bereits im Lineup sein");
            }
            if (!availableIds.isEmpty() && !availableIds.contains(req.playerInId())) {
                throw new BusinessValidationException("Einwechselspieler muss als verfuegbar markiert sein");
            }
        }
    }
}
