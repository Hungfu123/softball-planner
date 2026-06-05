package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.InvitationEntity;
import com.softball.adapter.out.persistence.mapper.InvitationMapper;
import com.softball.adapter.out.persistence.repository.SpringInvitationRepository;
import com.softball.domain.model.Invitation;
import com.softball.domain.port.out.InvitationRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class InvitationRepositoryAdapter implements InvitationRepository {

    private final SpringInvitationRepository repo;
    private final InvitationMapper mapper;

    public InvitationRepositoryAdapter(final SpringInvitationRepository repo, final InvitationMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    public List<Invitation> findAllOrderByUpdatedAtDesc() {
        return repo.findAllByOrderByUpdatedAtDesc().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<Invitation> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public Invitation save(final Invitation invitation) {
        if (invitation.getId() != null) {
            final InvitationEntity existing = repo.findById(invitation.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, invitation);
                return mapper.toDomain(repo.save(existing));
            }
        }
        return mapper.toDomain(repo.save(mapper.toEntity(invitation)));
    }

    @Override
    public void deleteById(final Long id) { repo.deleteById(id); }

    @Override
    public boolean existsById(final Long id) { return repo.existsById(id); }
}
