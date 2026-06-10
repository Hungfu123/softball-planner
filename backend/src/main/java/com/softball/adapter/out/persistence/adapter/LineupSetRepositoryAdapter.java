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
