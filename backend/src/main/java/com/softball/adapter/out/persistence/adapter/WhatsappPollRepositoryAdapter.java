package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.WhatsappPollEntity;
import com.softball.adapter.out.persistence.mapper.WhatsappPollMapper;
import com.softball.adapter.out.persistence.repository.SpringWhatsappPollRepository;
import com.softball.domain.model.WhatsappPoll;
import com.softball.domain.port.out.WhatsappPollRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class WhatsappPollRepositoryAdapter implements WhatsappPollRepository {

    private final SpringWhatsappPollRepository repo;
    private final WhatsappPollMapper mapper;

    public WhatsappPollRepositoryAdapter(final SpringWhatsappPollRepository repo, final WhatsappPollMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    public List<WhatsappPoll> findAll() {
        return repo.findAll().stream().map(mapper::toDomain).toList();
    }

    @Override
    public Optional<WhatsappPoll> findById(final Long id) {
        return repo.findById(id).map(mapper::toDomain);
    }

    @Override
    public WhatsappPoll save(final WhatsappPoll poll) {
        if (poll.getId() != null) {
            final WhatsappPollEntity existing = repo.findById(poll.getId()).orElse(null);
            if (existing != null) {
                mapper.updateEntity(existing, poll);
                return mapper.toDomain(repo.save(existing));
            }
        }
        return mapper.toDomain(repo.save(mapper.toEntity(poll)));
    }

    @Override
    public Optional<WhatsappPoll> findByGameDayId(final Long gameDayId) {
        return repo.findByGameDayId(gameDayId).map(mapper::toDomain);
    }

    @Override
    public void deleteById(final Long id) { repo.deleteById(id); }

    @Override
    public boolean existsById(final Long id) { return repo.existsById(id); }
}
