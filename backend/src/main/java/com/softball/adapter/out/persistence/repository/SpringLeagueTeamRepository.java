package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.LeagueTeamEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SpringLeagueTeamRepository extends JpaRepository<LeagueTeamEntity, Long> {
    List<LeagueTeamEntity> findBySeason_IdOrderByNameAsc(Long seasonId);
    Optional<LeagueTeamEntity> findBySeason_IdAndNameIgnoreCase(Long seasonId, String name);
}
