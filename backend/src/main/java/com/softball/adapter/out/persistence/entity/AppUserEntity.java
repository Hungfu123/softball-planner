package com.softball.adapter.out.persistence.entity;

import com.softball.domain.model.Role;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "app_user")
public class AppUserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "player_id", nullable = false, unique = true)
    private Long playerId;

    @Column(nullable = false)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(name = "may_score", nullable = false)
    private boolean mayScore;

    @Column(nullable = false)
    private boolean locked;

    @Column(name = "password_changed", nullable = false)
    private boolean passwordChanged;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "last_seen_at")
    private Instant lastSeenAt;

    public AppUserEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public Long getPlayerId() { return playerId; }
    public void setPlayerId(final Long playerId) { this.playerId = playerId; }
    public String getUsername() { return username; }
    public void setUsername(final String username) { this.username = username; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(final String passwordHash) { this.passwordHash = passwordHash; }
    public Role getRole() { return role; }
    public void setRole(final Role role) { this.role = role; }
    public boolean isMayScore() { return mayScore; }
    public void setMayScore(final boolean mayScore) { this.mayScore = mayScore; }
    public boolean isLocked() { return locked; }
    public void setLocked(final boolean locked) { this.locked = locked; }
    public boolean isPasswordChanged() { return passwordChanged; }
    public void setPasswordChanged(final boolean passwordChanged) { this.passwordChanged = passwordChanged; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(final Instant createdAt) { this.createdAt = createdAt; }
    public Instant getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(final Instant lastLoginAt) { this.lastLoginAt = lastLoginAt; }
    public Instant getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(final Instant lastSeenAt) { this.lastSeenAt = lastSeenAt; }
}
