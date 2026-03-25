package com.softball.adapter.dto;

import com.softball.domain.model.Substitution;

public record SubstitutionResponse(Long id, PlayerResponse playerOut, PlayerResponse playerIn, Integer inning) {
    public static SubstitutionResponse from(final Substitution sub) {
        return new SubstitutionResponse(
            sub.getId(),
            PlayerResponse.from(sub.getPlayerOut()),
            PlayerResponse.from(sub.getPlayerIn()),
            sub.getInning()
        );
    }
}
