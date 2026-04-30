package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.SpielbogenAtBatEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.adapter.out.persistence.mapper.SpielbogenAtBatMapper;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenAtBatRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenSlotRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenStealingRepository;
import com.softball.domain.model.BogenSide;
import com.softball.domain.model.SpielbogenAtBat;
import com.softball.domain.port.out.SpielbogenAtBatRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class SpielbogenAtBatRepositoryAdapter implements SpielbogenAtBatRepository {

    private final SpringSpielbogenAtBatRepository repo;
    private final SpringSpielbogenRepository bogenRepo;
    private final SpringSpielbogenSlotRepository slotRepo;
    private final SpringSpielbogenStealingRepository stealingRepo;
    private final SpielbogenAtBatMapper mapper;

    public SpielbogenAtBatRepositoryAdapter(final SpringSpielbogenAtBatRepository repo,
                                            final SpringSpielbogenRepository bogenRepo,
                                            final SpringSpielbogenSlotRepository slotRepo,
                                            final SpringSpielbogenStealingRepository stealingRepo,
                                            final SpielbogenAtBatMapper mapper) {
        this.repo = repo;
        this.bogenRepo = bogenRepo;
        this.slotRepo = slotRepo;
        this.stealingRepo = stealingRepo;
        this.mapper = mapper;
    }

    @Override
    public List<SpielbogenAtBat> findByBogenId(final Long bogenId) {
        return repo.findByBogen_IdOrderBySequenceAsc(bogenId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<SpielbogenAtBat> findByBogenIdAndSide(final Long bogenId, final BogenSide side) {
        return repo.findByBogen_IdAndSideOrderBySequenceAsc(bogenId, side.name()).stream()
                   .map(mapper::toDomain).toList();
    }

    @Override
    public Optional<SpielbogenAtBat> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<SpielbogenAtBat> findLatestForSide(final Long bogenId, final BogenSide side) {
        return repo.findFirstByBogen_IdAndSideOrderBySequenceDesc(bogenId, side.name()).map(mapper::toDomain);
    }

    @Override
    public SpielbogenAtBat save(final SpielbogenAtBat atBat) {
        SpielbogenEntity bogenEntity = bogenRepo.findById(atBat.getBogen().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", atBat.getBogen().getId()));
        SpielbogenSlotEntity slotEntity = slotRepo.findById(atBat.getSlot().getId())
            .orElseThrow(() -> new ResourceNotFoundException("SpielbogenSlot", atBat.getSlot().getId()));

        if (atBat.getId() != null) {
            SpielbogenAtBatEntity existing = repo.findById(atBat.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, atBat);
                return mapper.toDomain(repo.save(existing));
            }
        }
        SpielbogenAtBatEntity entity = mapper.toEntity(atBat, bogenEntity, slotEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }

    @Override
    public Integer findMaxSequenceForBogenSide(final Long bogenId, final BogenSide side) {
        Integer max = repo.findMaxSequence(bogenId, side.name());
        return max != null ? max : 0;
    }

    @Override
    public long countOutsInInning(final Long bogenId, final BogenSide side, final Integer inning) {
        long atBatOuts = repo.countWeightedOutsInInning(bogenId, side.name(), inning);
        long stealingOuts = stealingRepo.countOutsInInning(bogenId, side.name(), inning);
        return atBatOuts + stealingOuts;
    }
}
