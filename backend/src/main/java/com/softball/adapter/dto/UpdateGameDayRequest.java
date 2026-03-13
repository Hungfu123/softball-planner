package com.softball.adapter.dto;

import java.time.LocalDate;

public record UpdateGameDayRequest(
    LocalDate date,
    String label,
    String location
) {}
