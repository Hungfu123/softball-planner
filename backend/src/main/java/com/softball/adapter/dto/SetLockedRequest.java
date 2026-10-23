package com.softball.adapter.dto;

import jakarta.validation.constraints.NotNull;

public record SetLockedRequest(@NotNull Boolean locked) {}
