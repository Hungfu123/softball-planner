package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.SpielbogenAtBatEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenRunnerAdvanceEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.adapter.out.persistence.mapper.SpielbogenRunnerAdvanceMapper;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenAtBatRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRunnerAdvanceRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenSlotRepository;
import com.softball.domain.model.SpielbogenRunnerAdvance;
import com.softball.domain.port.out.SpielbogenRunnerAdvanceRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class SpielbogenRunnerAdvanceRepositoryAdapter implements SpielbogenRunnerAdvanceRepository {

    private final SpringSpielbogenRunnerAdvanceRepository repo;
    private final SpringSpielbogenRepository bogenRepo;
    private final SpringSpielbogenAtBatRepository atBatRepo;
    private final SpringSpielbogenSlotRepository slotRepo;
    private final SpielbogenRunnerAdvanceMapper mapper;

    public SpielbogenRunnerAdvanceRepositoryAdapter(final SpringSpielbogenRunnerAdvanceRepository repo,
                                                    final SpringSpielbogenRepository bogenRepo,
                                                    final SpringSpielbogenAtBatRepository atBatRepo,
                                                    final SpringSpielbogenSlotRepository slotRepo,
                                                    final SpielbogenRunnerAdvanceMapper mapper) {
        this.repo = repo;
        this.bogenRepo = bogenRepo;
        this.atBatRepo = atBatRepo;
        this.slotRepo = slotRepo;
        this.mapper = mapper;
    }

    @Override
    public List<SpielbogenRunnerAdvance> findByBogenId(final Long bogenId) {
        return repo.findByBogen_IdOrderByIdAsc(bogenId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public List<SpielbogenRunnerAdvance> findByAtBatId(final Long atBatId) {
        return repo.findByAtBat_IdOrderByIdAsc(atBatId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public SpielbogenRunnerAdvance save(final SpielbogenRunnerAdvance advance) {
        SpielbogenEntity bogenEntity = bogenRepo.findById(advance.getBogen().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", advance.getBogen().getId()));
        SpielbogenAtBatEntity atBatEntity = atBatRepo.findById(advance.getAtBat().getId())
            .orElseThrow(() -> new ResourceNotFoundException("SpielbogenAtBat", advance.getAtBat().getId()));
        SpielbogenSlotEntity slotEntity = slotRepo.findById(advance.getSlot().getId())
            .orElseThrow(() -> new ResourceNotFoundException("SpielbogenSlot", advance.getSlot().getId()));
        SpielbogenRunnerAdvanceEntity entity = mapper.toEntity(advance, bogenEntity, atBatEntity, slotEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public List<SpielbogenRunnerAdvance> saveAll(final List<SpielbogenRunnerAdvance> advances) {
        return advances.stream().map(this::save).toList();
    }

    @Override
    @Transactional
    public void deleteByAtBatId(final Long atBatId) {
        repo.deleteByAtBat_Id(atBatId);
    }
}
