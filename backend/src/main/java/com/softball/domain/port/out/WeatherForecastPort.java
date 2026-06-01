package com.softball.domain.port.out;

import com.softball.domain.model.Coordinates;
import com.softball.domain.model.DayForecast;

import java.time.LocalDate;
import java.util.Optional;

public interface WeatherForecastPort {
    Optional<DayForecast> forecast(Coordinates coords, LocalDate date);
}
