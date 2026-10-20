package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.PlayEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SpringPlayRepository extends JpaRepository<PlayEntity, Long> {

    List<PlayEntity> findAllByOrderByUpdatedAtDesc();

    List<PlayEntity> findByCategoryIdOrderByUpdatedAtDesc(Long categoryId);

    boolean existsByCategoryId(Long categoryId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PlayEntity p SET p.categoryId = :to WHERE p.categoryId = :from")
    int moveToCategory(@Param("from") Long from, @Param("to") Long to);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PlayEntity p SET p.counterpartPlayId = NULL WHERE p.counterpartPlayId = :id")
    int clearCounterpartReferences(@Param("id") Long id);
}
