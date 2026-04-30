package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.adapter.out.persistence.mapper.SpielbogenSlotMapper;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenSlotRepository;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenSlot;
import com.softball.domain.port.out.SpielbogenSlotRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Component
public class SpielbogenSlotRepositoryAdapter implements SpielbogenSlotRepository {

    private final SpringSpielbogenSlotRepository repo;
    private final SpringSpielbogenRepository bogenRepo;
    private final SpielbogenSlotMapper mapper;

    public SpielbogenSlotRepositoryAdapter(final SpringSpielbogenSlotRepository repo,
                                           final SpringSpielbogenRepository bogenRepo,
                                           final SpielbogenSlotMapper mapper) {
        this.repo = repo;
        this.bogenRepo = bogenRepo;
        this.mapper = mapper;
    }

    @Override
    public List<SpielbogenSlot> findByBogenId(final Long bogenId) {
        return repo.findByBogen_IdOrderByBattingOrderAsc(bogenId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<SpielbogenSlot> findByBogenIdAndSide(final Long bogenId, final BogenSide side) {
        return repo.findByBogen_IdAndSideOrderByBattingOrderAsc(bogenId, side.name()).stream()
                   .map(mapper::toDomain).toList();
    }

    @Override
    public Optional<SpielbogenSlot> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public SpielbogenSlot save(final SpielbogenSlot slot) {
        SpielbogenEntity bogenEntity = bogenRepo.findById(slot.getBogen().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", slot.getBogen().getId()));
        if (slot.getId() != null) {
            SpielbogenSlotEntity existing = repo.findById(slot.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, slot);
                return mapper.toDomain(repo.save(existing));
            }
        }
        SpielbogenSlotEntity entity = mapper.toEntity(slot, bogenEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    @Transactional
    public List<SpielbogenSlot> saveAll(final List<SpielbogenSlot> slots) {
        return slots.stream().map(this::save).toList();
    }

    @Override
    @Transactional
    public void deleteByBogenIdAndSide(final Long bogenId, final BogenSide side) {
        repo.deleteByBogen_IdAndSide(bogenId, side.name());
    }
}
