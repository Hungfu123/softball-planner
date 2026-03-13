package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.PlayerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SpringPlayerRepository extends JpaRepository<PlayerEntity, Long> {
    List<PlayerEntity> findByRegularTrue();
}
