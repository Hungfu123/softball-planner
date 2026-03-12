package com.softball.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdatePlayerRequest(String name, Boolean regular) {}
