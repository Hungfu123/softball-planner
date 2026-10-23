package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.AppUserEntity;
import com.softball.domain.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;

public interface SpringAppUserRepository extends JpaRepository<AppUserEntity, Long> {

    @Query("select u from AppUserEntity u where lower(u.username) = lower(:username)")
    Optional<AppUserEntity> findByUsernameIgnoreCase(String username);

    Optional<AppUserEntity> findByPlayerId(Long playerId);

    long countByRole(Role role);

    @Query("select count(u) > 0 from AppUserEntity u where lower(u.username) = lower(:username)")
    boolean existsByUsernameIgnoreCase(String username);

    @Modifying
    @Query("update AppUserEntity u set u.lastSeenAt = :zeitpunkt where lower(u.username) = lower(:username)")
    int updateLastSeenAt(String username, Instant zeitpunkt);

    @Modifying
    @Query("update AppUserEntity u set u.lastLoginAt = :zeitpunkt where lower(u.username) = lower(:username)")
    int updateLastLoginAt(String username, Instant zeitpunkt);
}
