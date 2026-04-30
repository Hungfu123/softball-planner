package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenStealingEventEntity;
import com.softball.adapter.out.persistence.mapper.SpielbogenStealingMapper;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenSlotRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenStealingRepository;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenStealingEvent;
import com.softball.domain.port.out.SpielbogenStealingRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class SpielbogenStealingRepositoryAdapter implements SpielbogenStealingRepository {

    private final SpringSpielbogenStealingRepository repo;
    private final SpringSpielbogenRepository bogenRepo;
    private final SpringSpielbogenSlotRepository slotRepo;
    private final SpielbogenStealingMapper mapper;

    public SpielbogenStealingRepositoryAdapter(final SpringSpielbogenStealingRepository repo,
                                               final SpringSpielbogenRepository bogenRepo,
                                               final SpringSpielbogenSlotRepository slotRepo,
                                               final SpielbogenStealingMapper mapper) {
        this.repo = repo;
        this.bogenRepo = bogenRepo;
        this.slotRepo = slotRepo;
        this.mapper = mapper;
    }

    @Override
    public List<SpielbogenStealingEvent> findByBogenId(final Long bogenId) {
        return repo.findByBogen_IdOrderByIdAsc(bogenId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<SpielbogenStealingEvent> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public SpielbogenStealingEvent save(final SpielbogenStealingEvent event) {
        SpielbogenEntity bogenEntity = bogenRepo.findById(event.getBogen().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", event.getBogen().getId()));
        SpielbogenSlotEntity slotEntity = slotRepo.findById(event.getSlot().getId())
            .orElseThrow(() -> new ResourceNotFoundException("SpielbogenSlot", event.getSlot().getId()));

        SpielbogenStealingEventEntity entity = mapper.toEntity(event, bogenEntity, slotEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    public long countOutsInInning(final Long bogenId, final BogenSide side, final Integer inning) {
        return repo.countOutsInInning(bogenId, side.name(), inning);
    }
}
