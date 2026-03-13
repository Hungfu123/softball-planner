package com.softball.adapter.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateLeagueTeamRequest(@NotBlank String name, boolean ownTeam) {}
