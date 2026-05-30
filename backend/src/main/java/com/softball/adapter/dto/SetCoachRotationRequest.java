package com.softball.adapter.dto;

import com.softball.domain.model.CoachRotationPair;

public record SetCoachRotationRequest(
    CoachRotationPair firstBaseCoachRotation,
    CoachRotationPair thirdBaseCoachRotation
) {}
