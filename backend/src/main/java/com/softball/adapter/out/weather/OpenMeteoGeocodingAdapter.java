package com.softball.adapter.out.weather;

import com.softball.domain.model.Coordinates;
import com.softball.domain.port.out.GeocodingPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "feature.weather.enabled", havingValue = "true", matchIfMissing = true)
public class OpenMeteoGeocodingAdapter implements GeocodingPort {

    private static final Logger log = LoggerFactory.getLogger(OpenMeteoGeocodingAdapter.class);
    private static final String BASE = "https://geocoding-api.open-meteo.com/v1/search";

    private final RestClient client;

    public OpenMeteoGeocodingAdapter(final RestClient.Builder builder) {
        this.client = builder.build();
    }

    @Override
    public Optional<Coordinates> geocode(final String location) {
        if (location == null || location.isBlank()) {
            return Optional.empty();
        }
        try {
            final String uri = UriComponentsBuilder.fromHttpUrl(BASE)
                .queryParam("name", location.trim())
                .queryParam("count", 1)
                .queryParam("language", "de")
                .queryParam("format", "json")
                .build().toUriString();

            final GeoResponse body = client.get().uri(uri).retrieve().body(GeoResponse.class);
            if (body == null || body.results() == null || body.results().isEmpty()) {
                return Optional.empty();
            }
            final GeoResult r = body.results().get(0);
            return Optional.of(new Coordinates(r.latitude(), r.longitude()));
        } catch (final Exception e) {
            log.warn("Geocoding für '{}' fehlgeschlagen: {}", location, e.getMessage());
            return Optional.empty();
        }
    }

    record GeoResponse(List<GeoResult> results) {}
    record GeoResult(double latitude, double longitude) {}
}
