package com.softball.adapter.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ApplyGameDayVotesRequest(@NotNull List<Long> add, @NotNull List<Long> remove) {}
