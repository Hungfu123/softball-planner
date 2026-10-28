package com.softball.adapter.dto;

import jakarta.validation.constraints.NotNull;

public record LineupReleaseRequest(@NotNull Boolean released) {}
