package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.AuditEventEntity;
import com.softball.domain.model.AuditEvent;
import org.springframework.stereotype.Component;

@Component
public class AuditEventMapper {

    public AuditEvent toDomain(final AuditEventEntity e) {
        return new AuditEvent(e.getId(), e.getUserId(), e.getUsername(), e.getKind(), e.getMethod(), e.getPath(),
                e.getLabel(), e.getTargetType(), e.getTargetId(), e.getStatus(), e.getOccurredAt());
    }

    public AuditEventEntity toEntity(final AuditEvent d) {
        final AuditEventEntity e = new AuditEventEntity();
        e.setId(d.id());
        e.setUserId(d.userId());
        e.setUsername(d.username());
        e.setKind(d.kind());
        e.setMethod(d.method());
        e.setPath(d.path());
        e.setLabel(d.label());
        e.setTargetType(d.targetType());
        e.setTargetId(d.targetId());
        e.setStatus(d.status());
        e.setOccurredAt(d.occurredAt());
        return e;
    }
}
