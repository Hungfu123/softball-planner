package com.softball.adapter.dto;

public record UpdateBaseStateRequest(
    Long first,
    Long second,
    Long third,
    Integer runsScored,
    Integer rbi
) {}
