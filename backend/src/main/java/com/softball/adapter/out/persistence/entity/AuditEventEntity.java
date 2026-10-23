package com.softball.adapter.out.persistence.entity;

import com.softball.domain.model.AuditKind;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "audit_event")
public class AuditEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false)
    private String username;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditKind kind;

    private String method;
    private String path;
    private String label;

    @Column(name = "target_type")
    private String targetType;

    @Column(name = "target_id")
    private Long targetId;

    private Integer status;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    public AuditEventEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(final Long userId) { this.userId = userId; }
    public String getUsername() { return username; }
    public void setUsername(final String username) { this.username = username; }
    public AuditKind getKind() { return kind; }
    public void setKind(final AuditKind kind) { this.kind = kind; }
    public String getMethod() { return method; }
    public void setMethod(final String method) { this.method = method; }
    public String getPath() { return path; }
    public void setPath(final String path) { this.path = path; }
    public String getLabel() { return label; }
    public void setLabel(final String label) { this.label = label; }
    public String getTargetType() { return targetType; }
    public void setTargetType(final String targetType) { this.targetType = targetType; }
    public Long getTargetId() { return targetId; }
    public void setTargetId(final Long targetId) { this.targetId = targetId; }
    public Integer getStatus() { return status; }
    public void setStatus(final Integer status) { this.status = status; }
    public Instant getOccurredAt() { return occurredAt; }
    public void setOccurredAt(final Instant occurredAt) { this.occurredAt = occurredAt; }
}
