package com.softball.adapter.dto;

public record TrainingImportResponse(
    int trainingsCreated,
    int trainingsSkipped,
    int playersNotFound
) {}
