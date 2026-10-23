package com.softball.adapter.dto;

import com.softball.domain.model.Role;
import jakarta.validation.constraints.NotNull;

public record SetRoleRequest(@NotNull Role role) {}
