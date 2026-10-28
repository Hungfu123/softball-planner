package com.softball.adapter.dto;

import com.softball.domain.service.BaseCoachRegel.BaseCoachAuskunft;

import java.util.List;

public record BaseCoachResponse(String firstBase, String thirdBase, List<Integer> startSlots) {

    public static BaseCoachResponse from(final BaseCoachAuskunft auskunft) {
        return new BaseCoachResponse(auskunft.ersteBase(), auskunft.dritteBase(), auskunft.startSchlagplaetze());
    }
}
