package com.softball.adapter.out.weather;

import com.softball.domain.model.Coordinates;
import com.softball.domain.model.DayForecast;
import com.softball.domain.model.HourSlot;
import com.softball.domain.port.out.WeatherForecastPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "feature.weather.enabled", havingValue = "true", matchIfMissing = true)
public class OpenMeteoWeatherAdapter implements WeatherForecastPort {

    private static final Logger log = LoggerFactory.getLogger(OpenMeteoWeatherAdapter.class);
    private static final String BASE = "https://api.open-meteo.com/v1/forecast";
    private static final int WINDOW_START = 8;
    private static final int WINDOW_END = 18;
    private static final int PREFERRED_HOUR = 13;

    private final RestClient client;

    public OpenMeteoWeatherAdapter(final RestClient.Builder builder) {
        this.client = builder.build();
    }

    @Override
    public Optional<DayForecast> forecast(final Coordinates coords, final LocalDate date) {
        if (coords == null || date == null) {
            return Optional.empty();
        }
        try {
            final String uri = UriComponentsBuilder.fromHttpUrl(BASE)
                .queryParam("latitude", coords.latitude())
                .queryParam("longitude", coords.longitude())
                .queryParam("hourly", "temperature_2m,precipitation_probability,weather_code")
                .queryParam("start_date", date.toString())
                .queryParam("end_date", date.toString())
                .queryParam("timezone", "Europe/Berlin")
                .build().toUriString();

            final ForecastResponse body = client.get().uri(uri).retrieve().body(ForecastResponse.class);
            if (body == null || body.hourly() == null || body.hourly().time() == null) {
                return Optional.empty();
            }
            return summarize(body.hourly());
        } catch (final Exception e) {
            log.warn("Forecast {} @ {},{} fehlgeschlagen: {}",
                date, coords.latitude(), coords.longitude(), e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<DayForecast> summarize(final Hourly h) {
        final List<String> times = h.time();
        Double min = null, max = null;
        int maxPrecip = 0;
        Integer preferredCode = null, firstCode = null;
        final List<HourSlot> slots = new ArrayList<>();

        for (int i = 0; i < times.size(); i++) {
            final int hour = parseHour(times.get(i));
            if (hour < WINDOW_START || hour > WINDOW_END) {
                continue;
            }
            final double t = h.temperature_2m().get(i);
            min = (min == null) ? t : Math.min(min, t);
            max = (max == null) ? t : Math.max(max, t);
            int precip = 0;
            if (h.precipitation_probability() != null) {
                final Integer p = h.precipitation_probability().get(i);
                if (p != null) precip = p;
            }
            maxPrecip = Math.max(maxPrecip, precip);
            int code = 0;
            if (h.weather_code() != null) {
                code = h.weather_code().get(i);
                if (firstCode == null) firstCode = code;
                if (hour == PREFERRED_HOUR) preferredCode = code;
            }
            slots.add(new HourSlot(hour, (int) Math.round(t), code, precip));
        }
        if (min == null) {
            return Optional.empty();
        }
        // wmoCode kann fehlen falls API weather_code weglässt → 0 (klar) als neutraler Default
        final int wmo = (preferredCode != null) ? preferredCode : (firstCode != null ? firstCode : 0);
        return Optional.of(new DayForecast(
            (int) Math.round(min), (int) Math.round(max), wmo, maxPrecip, slots));
    }

    private int parseHour(final String iso) {
        final int t = iso.indexOf('T');
        return Integer.parseInt(iso.substring(t + 1, t + 3));
    }

    record ForecastResponse(Hourly hourly) {}
    record Hourly(
        List<String> time,
        List<Double> temperature_2m,
        List<Integer> precipitation_probability,
        List<Integer> weather_code
    ) {}
}
