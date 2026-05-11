package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.mapper.InningAdvanceEventMapper;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringInningAdvanceEventRepository;
import com.softball.domain.model.InningAdvanceEvent;
import com.softball.domain.port.out.InningAdvanceEventRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class InningAdvanceEventRepositoryAdapter implements InningAdvanceEventRepository {

    private final SpringInningAdvanceEventRepository repo;
    private final SpringGameRepository gameRepo;
    private final InningAdvanceEventMapper mapper;

    public InningAdvanceEventRepositoryAdapter(final SpringInningAdvanceEventRepository repo,
                                                final SpringGameRepository gameRepo,
                                                final InningAdvanceEventMapper mapper) {
        this.repo = repo;
        this.gameRepo = gameRepo;
        this.mapper = mapper;
    }

    @Override
    public List<InningAdvanceEvent> findByGameIdOrderByCreatedAtAsc(final Long gameId) {
        return repo.findByGameIdOrderByCreatedAtAsc(gameId).stream()
            .map(mapper::toDomain).toList();
    }

    @Override
    public InningAdvanceEvent save(final InningAdvanceEvent event) {
        final GameEntity gameEntity = gameRepo.getReferenceById(event.getGame().getId());
        return mapper.toDomain(repo.save(mapper.toEntity(event, gameEntity)));
    }

    @Override
    @Transactional
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }
}
