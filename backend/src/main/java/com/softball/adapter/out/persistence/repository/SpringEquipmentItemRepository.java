package com.softball.adapter.out.persistence.repository;

import com.softball.adapter.out.persistence.entity.EquipmentItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SpringEquipmentItemRepository extends JpaRepository<EquipmentItemEntity, Long> {
    List<EquipmentItemEntity> findAllByOrderByCategoryAscNameAsc();
}
