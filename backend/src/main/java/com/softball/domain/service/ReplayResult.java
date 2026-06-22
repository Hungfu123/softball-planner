package com.softball.domain.service;

import java.util.Map;

/** Gesamtergebnis des Replays über AtBats + Stealing-Events. */
public record ReplayResult(int totalStealRuns, Map<Long, Integer> runsByPlayerId) {}
