package com.softball.adapter.dto;

import com.softball.domain.model.Drill;
import com.softball.domain.model.DrillCategory;

import java.util.List;

public record DrillResponse(String id, String name, List<DrillCategory> categories, int minPlayers,
                            List<String> equipment, String description, boolean hasImage, Integer pdfPage,
                            String rotation, String variants) {

    public static DrillResponse from(final Drill drill) {
        return new DrillResponse(
            drill.getId(),
            drill.getName(),
            drill.getCategories(),
            drill.getMinPlayers(),
            drill.getEquipment(),
            drill.getDescription(),
            drill.isHasImage(),
            drill.getPdfPage(),
            drill.getRotation(),
            drill.getVariants()
        );
    }
}
