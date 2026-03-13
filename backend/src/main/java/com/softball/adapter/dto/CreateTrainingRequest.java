package com.softball.adapter.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateTrainingRequest(@NotNull LocalDate date, String time, String location, String type) {}
