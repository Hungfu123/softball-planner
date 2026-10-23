package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.AuditEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;

public interface SpringAuditEventRepository
        extends JpaRepository<AuditEventEntity, Long>, JpaSpecificationExecutor<AuditEventEntity> {

    @Modifying
    @Query("delete from AuditEventEntity e where e.occurredAt < :cutoff")
    int deleteOlderThan(Instant cutoff);
}
