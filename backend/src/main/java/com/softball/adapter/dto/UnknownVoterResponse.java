package com.softball.adapter.dto;

import com.softball.application.VoterAssignmentService.UnknownVoter;

import java.time.LocalDate;

public record UnknownVoterResponse(String voterName, String source, Long targetId, LocalDate date) {
    public static UnknownVoterResponse from(final UnknownVoter u) {
        return new UnknownVoterResponse(u.voterName(), u.source(), u.targetId(), u.date());
    }
}
