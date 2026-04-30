package com.softball.adapter.dto;

import java.util.List;

public record SpielbogenLineupResponse(
    List<SpielbogenSlotResponse> home,
    List<SpielbogenSlotResponse> away
) {}
