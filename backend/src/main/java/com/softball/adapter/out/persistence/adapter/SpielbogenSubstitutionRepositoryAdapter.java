package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.SpielbogenEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSlotEntity;
import com.softball.adapter.out.persistence.entity.SpielbogenSubstitutionEntity;
import com.softball.adapter.out.persistence.mapper.SpielbogenSubstitutionMapper;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenSlotRepository;
import com.softball.adapter.out.persistence.repository.SpringSpielbogenSubstitutionRepository;
import com.softball.domain.model.SpielbogenSubstitution;
import com.softball.domain.port.out.SpielbogenSubstitutionRepository;
import com.softball.shared.exception.ResourceNotFoundException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class SpielbogenSubstitutionRepositoryAdapter implements SpielbogenSubstitutionRepository {

    private final SpringSpielbogenSubstitutionRepository repo;
    private final SpringSpielbogenRepository bogenRepo;
    private final SpringSpielbogenSlotRepository slotRepo;
    private final SpielbogenSubstitutionMapper mapper;

    public SpielbogenSubstitutionRepositoryAdapter(final SpringSpielbogenSubstitutionRepository repo,
                                                   final SpringSpielbogenRepository bogenRepo,
                                                   final SpringSpielbogenSlotRepository slotRepo,
                                                   final SpielbogenSubstitutionMapper mapper) {
        this.repo = repo;
        this.bogenRepo = bogenRepo;
        this.slotRepo = slotRepo;
        this.mapper = mapper;
    }

    @Override
    public List<SpielbogenSubstitution> findByBogenId(final Long bogenId) {
        return repo.findByBogen_IdOrderByInningAscIdAsc(bogenId).stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<SpielbogenSubstitution> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public SpielbogenSubstitution save(final SpielbogenSubstitution sub) {
        SpielbogenEntity bogenEntity = bogenRepo.findById(sub.getBogen().getId())
            .orElseThrow(() -> new ResourceNotFoundException("Spielbogen", sub.getBogen().getId()));
        SpielbogenSlotEntity slotEntity = slotRepo.findById(sub.getSlot().getId())
            .orElseThrow(() -> new ResourceNotFoundException("SpielbogenSlot", sub.getSlot().getId()));

        SpielbogenSubstitutionEntity entity = mapper.toEntity(sub, bogenEntity, slotEntity);
        return mapper.toDomain(repo.save(entity));
    }

    @Override
    public void deleteById(final Long id) {
        repo.deleteById(id);
    }
}
