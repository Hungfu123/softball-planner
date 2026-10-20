package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.PlayCategoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SpringPlayCategoryRepository extends JpaRepository<PlayCategoryEntity, Long> {

    List<PlayCategoryEntity> findAllByOrderBySortOrderAscNameAsc();

    Optional<PlayCategoryEntity> findByNameIgnoreCase(String name);
}
