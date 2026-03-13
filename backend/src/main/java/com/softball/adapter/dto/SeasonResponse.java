package com.softball.adapter.dto;

import com.softball.domain.model.Season;

public record SeasonResponse(Long id, String name, Integer year) {
    public static SeasonResponse from(final Season season) {
        return new SeasonResponse(season.getId(), season.getName(), season.getYear());
    }
}
