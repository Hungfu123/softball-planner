package com.softball.dto;

import com.softball.entity.Season;

public record SeasonResponse(Long id, String name, Integer year) {
    public static SeasonResponse from(final Season season) {
        return new SeasonResponse(season.getId(), season.getName(), season.getYear());
    }
}
