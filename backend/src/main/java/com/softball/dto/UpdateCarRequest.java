package com.softball.dto;

public record UpdateCarRequest(
    Integer totalSeats,
    String direction
) {}
