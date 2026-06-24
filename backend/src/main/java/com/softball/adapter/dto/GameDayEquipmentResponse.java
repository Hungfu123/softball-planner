package com.softball.adapter.dto;

import com.softball.domain.model.EquipmentItem;

public record GameDayEquipmentResponse(
    Long id, String name, String category, int quantity, String storageLocation, String notes, boolean used
) {
    public static GameDayEquipmentResponse from(final EquipmentItem i, final boolean used) {
        return new GameDayEquipmentResponse(i.getId(), i.getName(), i.getCategory(),
            i.getQuantity(), i.getStorageLocation(), i.getNotes(), used);
    }
}
