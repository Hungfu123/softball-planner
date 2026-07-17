package com.softball.adapter.dto;

import com.softball.application.VoterAssignmentService.UnknownVoter;

import java.time.LocalDate;

public record UnknownVoterResponse(String voterName, Long trainingId, LocalDate trainingDate) {
    public static UnknownVoterResponse from(final UnknownVoter u) {
        return new UnknownVoterResponse(u.voterName(), u.trainingId(), u.trainingDate());
    }
}
