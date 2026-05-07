package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenPositionChangeEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.adapter.out.persistence.mapper.SpielbogenPositionChangeMapper;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenPositionChangeRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenSlotRepository;
import com.softball.domain.model.SpielbogenPositionChange;
import com.softball.domain.port.out.SpielbogenPositionChangeRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
public class SpielbogenPositionChangeRepositoryAdapter implements SpielbogenPositionChangeRepository {

    private final SpringSpielbogenPositionChangeRepository repo;
    private final SpringSpielbogenRepository bogenRepo;
    private final SpringSpielbogenSlotRepository slotRepo;
    private final SpielbogenPositionChangeMapper mapper;

    public SpielbogenPositionChangeRepositoryAdapter(final SpringSpielbogenPositionChangeRepository repo,
                                                     final SpringSpielbogenRepository bogenRepo,
                                                     final SpringSpielbogenSlotRepository slotRepo,
                                                     final SpielbogenPositionChangeMapper mapper) {
        this.repo = repo;
        this.bogenRepo = bogenRepo;
        this.slotRepo = slotRepo;
        this.mapper = mapper;
    }

    @Override
    public List<SpielbogenPositionChange> findByBogenId(final Long bogenId) {
        return repo.findByBogen_IdOrderByInningAscIdAsc(bogenId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<SpielbogenPositionChange> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public SpielbogenPositionChange save(final SpielbogenPositionChange change) {
        SpielbogenEntity bogenEntity = bogenRepo.findById(change.getBogen().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", change.getBogen().getId()));
        SpielbogenSlotEntity slotEntity = slotRepo.findById(change.getSlot().getId())
            .orElseThrow(() -> new ResourceNotFoundException("SpielbogenSlot", change.getSlot().getId()));
        SpielbogenPositionChangeEntity entity = mapper.toEntity(change, bogenEntity, slotEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    @Transactional
    public void deleteByGroupId(final String groupId) {
        repo.deleteByGroupId(groupId);
    }
}
