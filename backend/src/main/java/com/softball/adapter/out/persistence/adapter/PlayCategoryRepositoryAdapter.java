package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.PlayCategoryEntity;
import com.softball.adapter.out.persistence.mapper.PlayMapper;
import com.softball.adapter.out.persistence.repository.SpringPlayCategoryRepository;
import com.softball.domain.model.PlayCategory;
import com.softball.domain.port.out.PlayCategoryRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class PlayCategoryRepositoryAdapter implements PlayCategoryRepository {

    private final SpringPlayCategoryRepository repo;
    private final PlayMapper mapper;

    public PlayCategoryRepositoryAdapter(final SpringPlayCategoryRepository repo, final PlayMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    public List<PlayCategory> findAll() {
        return repo.findAllByOrderBySortOrderAscNameAsc().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<PlayCategory> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<PlayCategory> findByNameIgnoreCase(final String name) {
        return repo.findByNameIgnoreCase(name).map(mapper::toDomain);
    }

    @Override
    public PlayCategory save(final PlayCategory category) {
        final PlayCategoryEntity entity = category.getId() == null
                ? new PlayCategoryEntity()
                : repo.findById(category.getId()).orElseGet(PlayCategoryEntity::new);
        mapper.updateEntity(entity, category);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }
}
