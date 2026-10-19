package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.CoachBillingProfileEntity;
import com.softball.adapter.out.persistence.mapper.CoachBillingProfileMapper;
import com.softball.adapter.out.persistence.repository.SpringCoachBillingProfileRepository;
import com.softball.domain.model.CoachBillingProfile;
import com.softball.domain.port.out.CoachBillingProfileRepository;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class CoachBillingProfileRepositoryAdapter implements CoachBillingProfileRepository {

    private final SpringCoachBillingProfileRepository repo;
    private final CoachBillingProfileMapper mapper;

    public CoachBillingProfileRepositoryAdapter(final SpringCoachBillingProfileRepository repo,
                                                final CoachBillingProfileMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    public Optional<CoachBillingProfile> find() {
        return repo.findById(CoachBillingProfile.SINGLETON_ID).map(mapper::toDomain);
    }

    @Override
    public CoachBillingProfile save(final CoachBillingProfile profile) {
        final CoachBillingProfileEntity entity = repo.findById(CoachBillingProfile.SINGLETON_ID)
            .orElseGet(CoachBillingProfileEntity::new);
        mapper.updateEntity(entity, profile);
        return mapper.toDomain(repo.save(entity));
    }
}
