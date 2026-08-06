package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.mapper.SpielbogenMapper;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import com.softball.domain.model.BogenStatus;
import com.softball.domain.model.Spielbogen;
import com.softball.domain.port.out.SpielbogenRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class SpielbogenRepositoryAdapter implements SpielbogenRepository {

    private final SpringSpielbogenRepository repo;
    private final SpielbogenMapper mapper;

    public SpielbogenRepositoryAdapter(final SpringSpielbogenRepository repo, final SpielbogenMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    public List<Spielbogen> findAll() {
        return repo.findAllByOrderByDateDesc().stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<Spielbogen> findBySeasonId(final Long seasonId) {
        return repo.findBySeasonIdOrderByDateDesc(seasonId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<Spielbogen> findByStatus(final BogenStatus status) {
        return repo.findByStatusOrderByDateDesc(status.name()).stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<Spielbogen> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Spielbogen save(final Spielbogen bogen) {
        if (bogen.getId() != null) {
            SpielbogenEntity existing = repo.findById(bogen.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, bogen);
                return mapper.toDomain(repo.save(existing));
            }
        }
        SpielbogenEntity entity = mapper.toEntity(bogen);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    public boolean existsById(final Long id) {
        return repo.existsById(id);
    }

    @Override
    public Optional<Spielbogen> findByPublicToken(final String publicToken) {
        return repo.findByPublicToken(publicToken).map(mapper::toDomain);
    }
}
