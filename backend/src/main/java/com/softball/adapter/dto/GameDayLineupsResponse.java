package com.softball.adapter.dto;

import java.util.List;
import java.util.Map;

public record GameDayLineupsResponse(
    Map<Long, List<LineupEntryResponse>> lineups,
    Map<Long, List<GameStaffResponse>> staff,
    Map<Long, List<SubstitutionResponse>> substitutions,
    Map<Long, BaseCoachResponse> baseCoaches
) {}
