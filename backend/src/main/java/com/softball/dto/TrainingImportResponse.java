package com.softball.dto;

public record TrainingImportResponse(
    int trainingsCreated,
    int trainingsSkipped,
    int playersNotFound
) {}
