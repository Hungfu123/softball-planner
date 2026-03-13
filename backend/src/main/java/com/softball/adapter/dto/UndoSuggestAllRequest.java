package com.softball.adapter.dto;

import java.util.List;
import java.util.Map;

public record UndoSuggestAllRequest(
    Map<Long, List<LineupEntryRequest>> oldLineups
) {}
