package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.mapper.AutomaticOutEventMapper;
import com.softball.adapter.out.persistence.repository.SpringAutomaticOutEventRepository;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.domain.model.AutomaticOutEvent;
import com.softball.domain.port.out.AutomaticOutEventRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class AutomaticOutEventRepositoryAdapter implements AutomaticOutEventRepository {

    private final SpringAutomaticOutEventRepository repo;
    private final SpringGameRepository gameRepo;
    private final AutomaticOutEventMapper mapper;

    public AutomaticOutEventRepositoryAdapter(final SpringAutomaticOutEventRepository repo,
                                              final SpringGameRepository gameRepo,
                                              final AutomaticOutEventMapper mapper) {
        this.repo = repo;
        this.gameRepo = gameRepo;
        this.mapper = mapper;
    }

    @Override
    public List<AutomaticOutEvent> findByGameIdOrderByCreatedAtAsc(final Long gameId) {
        return repo.findByGameIdOrderByCreatedAtAsc(gameId).stream()
            .map(mapper::toDomain).toList();
    }

    @Override
    public AutomaticOutEvent save(final AutomaticOutEvent event) {
        final GameEntity gameEntity = gameRepo.getReferenceById(event.getGame().getId());
        return mapper.toDomain(repo.save(mapper.toEntity(event, gameEntity)));
    }

    @Override
    @Transactional
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }
}
