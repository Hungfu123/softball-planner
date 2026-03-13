package com.softball.adapter.dto;

import java.time.LocalDate;

public record UpdateTrainingRequest(LocalDate date, String time, String location, Boolean cancelled, String type) {}
