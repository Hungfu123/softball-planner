package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;

public record ChangeUsernameRequest(@NotBlank String username) {}
