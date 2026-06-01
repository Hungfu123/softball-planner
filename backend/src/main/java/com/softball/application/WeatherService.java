package com.softball.application;

import com.softball.domain.model.Coordinates;
import com.softball.domain.model.DayForecast;
import com.softball.domain.port.out.GeocodingPort;
import com.softball.domain.port.out.WeatherForecastPort;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
@ConditionalOnProperty(name = "feature.weather.enabled", havingValue = "true", matchIfMissing = true)
public class WeatherService {

    private static final int HORIZON_DAYS = 16;
    private static final Duration FORECAST_TTL = Duration.ofHours(2);

    private final GeocodingPort geocoding;
    private final WeatherForecastPort forecast;
    private final Clock clock;

    private final ConcurrentHashMap<String, Optional<Coordinates>> geoCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CacheEntry> forecastCache = new ConcurrentHashMap<>();

    public WeatherService(final GeocodingPort geocoding,
                          final WeatherForecastPort forecast,
                          final Clock clock) {
        this.geocoding = geocoding;
        this.forecast = forecast;
        this.clock = clock;
    }

    public Optional<DayForecast> getForecast(final String location, final LocalDate date) {
        if (location == null || location.isBlank() || date == null) {
            return Optional.empty();
        }
        final LocalDate today = LocalDate.now(clock);
        if (date.isBefore(today) || date.isAfter(today.plusDays(HORIZON_DAYS))) {
            return Optional.empty();
        }
        final Optional<Coordinates> coords =
            geoCache.computeIfAbsent(location.trim(), geocoding::geocode);
        if (coords.isEmpty()) {
            return Optional.empty();
        }
        return cachedForecast(coords.get(), date);
    }

    private Optional<DayForecast> cachedForecast(final Coordinates c, final LocalDate date) {
        final String key = c.latitude() + "," + c.longitude() + "," + date;
        final Instant now = clock.instant();
        final CacheEntry hit = forecastCache.get(key);
        if (hit != null && now.isBefore(hit.expiresAt())) {
            return hit.value();
        }
        final Optional<DayForecast> fresh = forecast.forecast(c, date);
        forecastCache.put(key, new CacheEntry(fresh, now.plus(FORECAST_TTL)));
        return fresh;
    }

    private record CacheEntry(Optional<DayForecast> value, Instant expiresAt) {}
}
