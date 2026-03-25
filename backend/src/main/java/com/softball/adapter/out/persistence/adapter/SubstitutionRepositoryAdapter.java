package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.GameEntity;
import com.softball.adapter.out.persistence.entity.PlayerEntity;
import com.softball.adapter.out.persistence.mapper.SubstitutionMapper;
import com.softball.adapter.out.persistence.repository.SpringGameRepository;
import com.softball.adapter.out.persistence.repository.SpringPlayerRepository;
import com.softball.adapter.out.persistence.repository.SpringSubstitutionRepository;
import com.softball.domain.model.Substitution;
import com.softball.domain.port.out.SubstitutionRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class SubstitutionRepositoryAdapter implements SubstitutionRepository {

    private final SpringSubstitutionRepository repo;
    private final SpringGameRepository gameRepo;
    private final SpringPlayerRepository playerRepo;
    private final SubstitutionMapper mapper;

    public SubstitutionRepositoryAdapter(final SpringSubstitutionRepository repo,
                                          final SpringGameRepository gameRepo,
                                          final SpringPlayerRepository playerRepo,
                                          final SubstitutionMapper mapper) {
        this.repo = repo;
        this.gameRepo = gameRepo;
        this.playerRepo = playerRepo;
        this.mapper = mapper;
    }

    @Override
    public List<Substitution> findByGameId(final Long gameId) {
        return repo.findByGameIdOrderByInningAsc(gameId).stream()
            .map(mapper::toDomain).toList();
    }

    @Override
    public List<Substitution> findByGameIdIn(final List<Long> gameIds) {
        return repo.findByGameIdInOrderByInningAsc(gameIds).stream()
            .map(mapper::toDomain).toList();
    }

    @Override
    @Transactional
    public void deleteByGameId(final Long gameId) {
        repo.deleteByGameId(gameId);
    }

    @Override
    public Substitution save(final Substitution substitution) {
        final GameEntity gameEntity = gameRepo.getReferenceById(substitution.getGame().getId());
        final PlayerEntity playerOutEntity = playerRepo.getReferenceById(substitution.getPlayerOut().getId());
        final PlayerEntity playerInEntity = playerRepo.getReferenceById(substitution.getPlayerIn().getId());
        final var entity = mapper.toEntity(substitution, gameEntity, playerOutEntity, playerInEntity);
        return mapper.toDomain(repo.save(entity));
    }
}
