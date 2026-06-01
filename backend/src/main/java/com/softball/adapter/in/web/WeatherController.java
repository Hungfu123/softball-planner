package com.softball.adapter.in.web;

import com.softball.adapter.dto.WeatherResponse;
import com.softball.application.GameDayService;
import com.softball.application.WeatherService;
import com.softball.domain.model.GameDay;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@ConditionalOnProperty(name = "feature.weather.enabled", havingValue = "true", matchIfMissing = true)
public class WeatherController {

    private final WeatherService weatherService;
    private final GameDayService gameDayService;

    public WeatherController(final WeatherService weatherService, final GameDayService gameDayService) {
        this.weatherService = weatherService;
        this.gameDayService = gameDayService;
    }

    @GetMapping("/api/gamedays/{gameDayId}/weather")
    public ResponseEntity<WeatherResponse> getWeather(@PathVariable final Long gameDayId) {
        final GameDay gd = gameDayService.findById(gameDayId);
        return weatherService.getForecast(gd.getLocation(), gd.getDate())
            .map(WeatherResponse::from)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
