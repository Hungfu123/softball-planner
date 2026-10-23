package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.AppUserEntity;
import com.softball.domain.model.AppUser;
import org.springframework.stereotype.Component;

@Component
public class AppUserMapper {

    public AppUser toDomain(final AppUserEntity entity) {
        if (entity == null) return null;
        final AppUser user = new AppUser();
        user.setId(entity.getId());
        user.setPlayerId(entity.getPlayerId());
        user.setUsername(entity.getUsername());
        user.setPasswordHash(entity.getPasswordHash());
        user.setRole(entity.getRole());
        user.setMayScore(entity.isMayScore());
        user.setLocked(entity.isLocked());
        user.setPasswordChanged(entity.isPasswordChanged());
        user.setCreatedAt(entity.getCreatedAt());
        user.setLastLoginAt(entity.getLastLoginAt());
        user.setLastSeenAt(entity.getLastSeenAt());
        return user;
    }

    public AppUserEntity toEntity(final AppUser domain) {
        if (domain == null) return null;
        final AppUserEntity entity = new AppUserEntity();
        entity.setId(domain.getId());
        updateEntity(entity, domain);
        return entity;
    }

    public void updateEntity(final AppUserEntity entity, final AppUser domain) {
        entity.setPlayerId(domain.getPlayerId());
        entity.setUsername(domain.getUsername());
        entity.setPasswordHash(domain.getPasswordHash());
        entity.setRole(domain.getRole());
        entity.setMayScore(domain.isMayScore());
        entity.setLocked(domain.isLocked());
        entity.setPasswordChanged(domain.isPasswordChanged());
        entity.setCreatedAt(domain.getCreatedAt());
        entity.setLastLoginAt(domain.getLastLoginAt());
        entity.setLastSeenAt(domain.getLastSeenAt());
    }
}
