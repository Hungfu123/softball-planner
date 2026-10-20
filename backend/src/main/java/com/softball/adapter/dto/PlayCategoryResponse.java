package com.softball.adapter.dto;

import com.softball.domain.model.PlayCategory;

public record PlayCategoryResponse(Long id, String name, int sortOrder) {

    public static PlayCategoryResponse from(final PlayCategory category) {
        return new PlayCategoryResponse(category.getId(), category.getName(), category.getSortOrder());
    }
}
