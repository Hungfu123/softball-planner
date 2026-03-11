package com.softball.dto;

import com.softball.entity.Car;

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
