package com.softball.adapter.out.persistence.mapper;

import com.softball.adapter.out.persistence.entity.EquipmentItemEntity;
import com.softball.domain.model.EquipmentItem;
import org.springframework.stereotype.Component;

@Component
public class EquipmentItemMapper {

    public EquipmentItem toDomain(final EquipmentItemEntity e) {
        if (e == null) return null;
        return new EquipmentItem(e.getId(), e.getName(),
            e.getQuantity(), e.getStorageLocation(), e.getNotes());
    }

    public EquipmentItemEntity toEntity(final EquipmentItem d) {
        final EquipmentItemEntity e = new EquipmentItemEntity();
        e.setId(d.getId());
        applyFields(e, d);
        return e;
    }

    public void updateEntity(final EquipmentItemEntity e, final EquipmentItem d) {
        applyFields(e, d);
    }

    private void applyFields(final EquipmentItemEntity e, final EquipmentItem d) {
        e.setName(d.getName());
        e.setQuantity(d.getQuantity());
        e.setStorageLocation(d.getStorageLocation());
        e.setNotes(d.getNotes());
    }
}
