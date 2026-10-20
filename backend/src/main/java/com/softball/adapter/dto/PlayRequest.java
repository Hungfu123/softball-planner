package com.softball.adapter.dto;

import com.softball.domain.model.GameState;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PlayRequest(
        @NotBlank String title,
        @NotNull Long categoryId,
        GameState gameState,
        String gameStateNote,
        Long counterpartPlayId,
        @NotNull @Valid List<PlayStepRequest> steps
) {}
