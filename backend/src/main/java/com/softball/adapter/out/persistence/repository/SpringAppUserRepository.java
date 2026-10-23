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

    long countByRoleAndLocked(Role role, boolean locked);

    @Query("select count(u) > 0 from AppUserEntity u where lower(u.username) = lower(:username)")
    boolean existsByUsernameIgnoreCase(String username);

    @Modifying
    @Query("update AppUserEntity u set u.lastSeenAt = :zeitpunkt where lower(u.username) = lower(:username)")
    int updateLastSeenAt(String username, Instant zeitpunkt);

    @Modifying
    @Query("update AppUserEntity u set u.lastLoginAt = :zeitpunkt where lower(u.username) = lower(:username)")
    int updateLastLoginAt(String username, Instant zeitpunkt);

    @Modifying
    @Query("update AppUserEntity u set u.locked = :locked where u.id = :id")
    int updateLocked(Long id, boolean locked);

    @Modifying
    @Query("update AppUserEntity u set u.role = :role where u.id = :id")
    int updateRole(Long id, Role role);

    @Modifying
    @Query("update AppUserEntity u set u.mayScore = :mayScore where u.id = :id")
    int updateMayScore(Long id, boolean mayScore);

    @Modifying
    @Query("update AppUserEntity u set u.passwordHash = :passwordHash, u.passwordChanged = :passwordChanged where u.id = :id")
    int updatePassword(Long id, String passwordHash, boolean passwordChanged);

    @Modifying
    @Query("update AppUserEntity u set u.username = :username where u.id = :id")
    int updateUsername(Long id, String username);
}
