package com.softball.dto;

import java.time.LocalDate;

public record UpdateTrainingRequest(LocalDate date, String time, String location, Boolean cancelled, String type) {}
