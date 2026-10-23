package com.softball.adapter.dto;

import jakarta.validation.constraints.NotNull;

/** Bewusst ohne Passwort: es kommt aus der Konfiguration ({@code app.auth.player-password}). */
public record CreateUserRequest(@NotNull Long playerId) {}
