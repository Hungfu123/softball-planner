package com.softball.domain.port.out;

import com.softball.domain.model.EquipmentItem;
import java.util.List;
import java.util.Optional;

public interface EquipmentItemRepository {
    List<EquipmentItem> findAllOrdered();
    Optional<EquipmentItem> findById(Long id);
    EquipmentItem save(EquipmentItem item);
    void deleteById(Long id);
}
