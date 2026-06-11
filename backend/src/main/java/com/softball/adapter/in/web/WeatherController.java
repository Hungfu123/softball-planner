package com.softball.adapter.in.web;

import com.softball.adapter.dto.WeatherResponse;
import com.softball.application.GameDayService;
import com.softball.application.TrainingService;
import com.softball.application.WeatherService;
import com.softball.domain.model.GameDay;
import com.softball.domain.model.Training;
import org.springframework.beans.factory.annotation.Value;
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
    private final TrainingService trainingService;
    private final String defaultLocation;

    public WeatherController(final WeatherService weatherService,
                             final GameDayService gameDayService,
                             final TrainingService trainingService,
                             @Value("${weather.default-location:Düsseldorf}") final String defaultLocation) {
        this.weatherService = weatherService;
        this.gameDayService = gameDayService;
        this.trainingService = trainingService;
        this.defaultLocation = defaultLocation;
    }

    @GetMapping("/api/gamedays/{gameDayId}/weather")
    public ResponseEntity<WeatherResponse> getWeather(@PathVariable final Long gameDayId) {
        final GameDay gd = gameDayService.findById(gameDayId);
        // Kein Ort am Spieltag → Default-Standort (Dead-Sox-Heimat) fürs Wetter.
        final String location = (gd.getLocation() == null || gd.getLocation().isBlank())
            ? defaultLocation
            : gd.getLocation();
        return weatherService.getForecast(location, gd.getDate())
            .map(WeatherResponse::from)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/api/trainings/{trainingId}/weather")
    public ResponseEntity<WeatherResponse> getTrainingWeather(@PathVariable final Long trainingId) {
        final Training t = trainingService.findById(trainingId);
        final String location = (t.getLocation() == null || t.getLocation().isBlank())
            ? defaultLocation
            : t.getLocation();
        return weatherService.getForecast(location, t.getDate())
            .map(WeatherResponse::from)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
