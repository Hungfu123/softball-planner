package com.softball.adapter.dto;

import java.util.List;
import java.util.Map;

public record SuggestAllResponse(
    Map<Long, List<LineupEntryResponse>> oldLineups,
    Map<Long, List<LineupEntryResponse>> newLineups
) {}
