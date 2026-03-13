package com.softball.adapter.dto;

import com.softball.domain.model.Car;

public record CarResponse(Long id, PlayerResponse driver, Integer totalSeats, String direction, Long gameDayId) {
    public static CarResponse from(final Car car) {
        return new CarResponse(
            car.getId(),
            PlayerResponse.from(car.getDriver()),
            car.getTotalSeats(),
            car.getDirection(),
            car.getGameDayId()
        );
    }
}
