package com.softball.application;

import com.softball.domain.model.Game;
import com.softball.domain.model.LineupEntry;
import com.softball.domain.model.LineupSet;
import com.softball.domain.model.LineupSetEntry;
import com.softball.domain.port.out.GameRepository;
import com.softball.domain.port.out.LineupEntryRepository;
import com.softball.domain.port.out.LineupSetRepository;
import com.softball.shared.exception.BusinessValidationException;
import com.softball.shared.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class LineupSetService {

    private static final Logger log = LoggerFactory.getLogger(LineupSetService.class);

    private final LineupSetRepository lineupSetRepository;
    private final GameRepository gameRepository;
    private final LineupEntryRepository lineupEntryRepository;

    public LineupSetService(final LineupSetRepository lineupSetRepository,
                            final GameRepository gameRepository,
                            final LineupEntryRepository lineupEntryRepository) {
        this.lineupSetRepository = lineupSetRepository;
        this.gameRepository = gameRepository;
        this.lineupEntryRepository = lineupEntryRepository;
    }

    @Transactional(readOnly = true)
    public List<LineupSet> findByGameDay(final Long gameDayId) {
        return lineupSetRepository.findByGameDayId(gameDayId);
    }

    @Transactional
    public LineupSet snapshot(final Long gameDayId, final String name) {
        if (name == null || name.isBlank()) {
            throw new BusinessValidationException("Set-Name darf nicht leer sein");
        }
        final List<Game> games = gameRepository.findByGameDayIdOrderByGameNumberAsc(gameDayId);
        if (games.isEmpty()) {
            throw new ResourceNotFoundException("GameDay", gameDayId);
        }
        final Map<Long, Integer> gameNumberById = games.stream()
            .collect(Collectors.toMap(Game::getId, Game::getGameNumber));
        final List<Long> gameIds = games.stream().map(Game::getId).toList();
        final List<LineupEntry> entries = lineupEntryRepository.findByGameIdInOrderByBattingOrderAsc(gameIds);

        final int sortOrder = lineupSetRepository.maxSortOrder(gameDayId) + 1;
        final LineupSet set = new LineupSet(gameDayId, name.trim(), sortOrder);
        set.setEntries(entries.stream().map(e -> new LineupSetEntry(
            gameNumberById.get(e.getGame().getId()),
            e.getPlayer(),
            e.getPosition(),
            e.getBattingOrder(),
            e.getDhBatterPlayer()
        )).toList());

        final LineupSet saved = lineupSetRepository.save(set);
        log.info("Lineup-Set '{}' fuer GameDay {} mit {} Eintraegen gespeichert", name, gameDayId, saved.getEntries().size());
        return saved;
    }

    @Transactional
    public LineupSet rename(final Long setId, final String name) {
        if (name == null || name.isBlank()) {
            throw new BusinessValidationException("Set-Name darf nicht leer sein");
        }
        final LineupSet set = lineupSetRepository.findById(setId)
            .orElseThrow(() -> new ResourceNotFoundException("LineupSet", setId));
        set.setName(name.trim());
        final LineupSet saved = lineupSetRepository.save(set);
        log.info("Lineup-Set {} umbenannt zu '{}'", setId, name);
        return saved;
    }

    @Transactional
    public void delete(final Long setId) {
        lineupSetRepository.findById(setId)
            .orElseThrow(() -> new ResourceNotFoundException("LineupSet", setId));
        lineupSetRepository.deleteById(setId);
        log.info("Lineup-Set {} geloescht", setId);
    }
}
