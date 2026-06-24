package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.mapper.EquipmentItemMapper;
import com.softball.adapter.out.persistence.repository.SpringEquipmentItemRepository;
import com.softball.domain.model.EquipmentItem;
import com.softball.domain.port.out.EquipmentItemRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class EquipmentItemRepositoryAdapter implements EquipmentItemRepository {

    private final SpringEquipmentItemRepository repo;
    private final EquipmentItemMapper mapper;

    public EquipmentItemRepositoryAdapter(final SpringEquipmentItemRepository repo,
                                          final EquipmentItemMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    public List<EquipmentItem> findAllOrdered() {
        return repo.findAllByOrderByNameAsc().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<EquipmentItem> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public EquipmentItem save(final EquipmentItem item) {
        if (item.getId() != null) {
            final var existing = repo.findById(item.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, item);
                return mapper.toDomain(repo.save(existing));
            }
        }
        return mapper.toDomain(repo.save(mapper.toEntity(item)));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }
}
