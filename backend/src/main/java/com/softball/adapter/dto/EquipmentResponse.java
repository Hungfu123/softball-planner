package com.softball.adapter.dto;

import com.softball.domain.model.EquipmentItem;

public record EquipmentResponse(
    Long id, String name, int quantity, String storageLocation, String notes
) {
    public static EquipmentResponse from(final EquipmentItem i) {
        return new EquipmentResponse(i.getId(), i.getName(),
            i.getQuantity(), i.getStorageLocation(), i.getNotes());
    }
}
