package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.LineupSetEntity;
import com.softball.adapter.out.persistence.mapper.LineupSetMapper;
import com.softball.adapter.out.persistence.repository.SpringLineupSetRepository;
import com.softball.domain.model.LineupSet;
import com.softball.domain.port.out.LineupSetRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
public class LineupSetRepositoryAdapter implements LineupSetRepository {

    private final SpringLineupSetRepository repo;
    private final LineupSetMapper mapper;

    public LineupSetRepositoryAdapter(final SpringLineupSetRepository repo, final LineupSetMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<LineupSet> findByGameDayId(final Long gameDayId) {
        return repo.findByGameDayIdOrderBySortOrderAsc(gameDayId).stream().map(mapper::toDomain).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<LineupSet> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    @Transactional
    public LineupSet save(final LineupSet lineupSet) {
        if (lineupSet.getId() != null) {
            // Hibernate ersetzt ersetzte Kinder-Zeilen in einem Flush per insert-before-delete —
            // der Unique-Constraint der Rotationen (lineup_set_id, game_number) knallt dann,
            // obwohl das Ergebnis korrekt waere ("Datensatz wird noch referenziert"-400).
            // Deshalb zweiphasig: erst die alten Kinder weglaschen (eigener Flush),
            // dann die neuen speichern.
            repo.findById(lineupSet.getId()).ifPresent(existing -> {
                existing.getEntries().clear();
                existing.getStaff().clear();
                existing.getAvailablePlayers().clear();
                existing.getGameRotations().clear();
                repo.save(existing);
                repo.flush();
            });
        }
        final LineupSetEntity entity = mapper.toEntity(lineupSet);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    @Transactional
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public int maxSortOrder(final Long gameDayId) {
        return repo.maxSortOrder(gameDayId);
    }
}
