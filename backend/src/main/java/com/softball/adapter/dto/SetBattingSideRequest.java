package com.softball.adapter.dto;

import jakarta.validation.constraints.Pattern;

public record SetBattingSideRequest(
    @Pattern(regexp = "top|bottom", message = "battingSide muss 'top' oder 'bottom' sein")
    String battingSide
) {}
