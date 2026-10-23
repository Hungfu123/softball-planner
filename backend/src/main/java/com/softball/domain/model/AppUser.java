package com.softball.domain.model;

import java.time.Instant;

public class AppUser {
    private Long id;
    private Long playerId;
    private String username;
    private String passwordHash;
    private Role role;
    private boolean mayScore;
    private boolean locked;
    private boolean passwordChanged;
    private Instant createdAt;
    private Instant lastLoginAt;
    private Instant lastSeenAt;

    public AppUser() {}

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
