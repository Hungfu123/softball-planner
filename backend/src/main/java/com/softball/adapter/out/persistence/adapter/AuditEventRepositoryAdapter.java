package com.softball.adapter.out.persistence.adapter;

import com.softball.adapter.out.persistence.entity.AuditEventEntity;
import com.softball.adapter.out.persistence.mapper.AuditEventMapper;
import com.softball.adapter.out.persistence.repository.SpringAuditEventRepository;
import com.softball.domain.model.AuditEvent;
import com.softball.domain.model.AuditQuery;
import com.softball.domain.port.out.AuditEventRepository;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
public class AuditEventRepositoryAdapter implements AuditEventRepository {

    private final SpringAuditEventRepository repo;
    private final AuditEventMapper mapper;

    public AuditEventRepositoryAdapter(final SpringAuditEventRepository repo, final AuditEventMapper mapper) {
        this.repo = repo;
        this.mapper = mapper;
    }

    @Override
    public AuditEvent save(final AuditEvent event) {
        return mapper.toDomain(repo.save(mapper.toEntity(event)));
    }

    @Override
    public List<AuditEvent> find(final AuditQuery query, final int hoechstens) {
        Specification<AuditEventEntity> spec = (root, q, cb) -> cb.conjunction();
        if (query.userId() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("userId"), query.userId()));
        }
        if (query.from() != null) {
            spec = spec.and((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("occurredAt"), query.from()));
        }
        if (query.to() != null) {
            spec = spec.and((root, q, cb) -> cb.lessThanOrEqualTo(root.get("occurredAt"), query.to()));
        }
        if (query.kind() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("kind"), query.kind()));
        }
        // findBy(..).limit(..) statt findAll(..): ein Pageable zoege eine count-Abfrage ueber den
        // ganzen Zeitraum nach sich, und gerade die wollen wir ja vermeiden.
        final Sort neuesteZuerst = Sort.by(Sort.Direction.DESC, "occurredAt", "id");
        final Specification<AuditEventEntity> fertig = spec;
        return repo.findBy(fertig, q -> q.sortBy(neuesteZuerst).limit(hoechstens).all()).stream()
                .map(mapper::toDomain).toList();
    }

    @Override
    @Transactional
    public long deleteOlderThan(final Instant cutoff) {
        return repo.deleteOlderThan(cutoff);
    }
}
