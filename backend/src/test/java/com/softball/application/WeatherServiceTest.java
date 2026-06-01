package com.softball.application;

import com.softball.domain.model.Coordinates;
import com.softball.domain.model.DayForecast;
import com.softball.domain.port.out.GeocodingPort;
import com.softball.domain.port.out.WeatherForecastPort;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class WeatherServiceTest {

    private final Clock clock = Clock.fixed(
        LocalDate.of(2026, 6, 1).atStartOfDay(ZoneId.of("Europe/Berlin")).toInstant(),
        ZoneId.of("Europe/Berlin"));

    @Test
    void returnsForecast_andCachesGeocode() {
        GeocodingPort geo = mock(GeocodingPort.class);
        WeatherForecastPort wx = mock(WeatherForecastPort.class);
        Coordinates c = new Coordinates(50.93, 6.95);
        DayForecast f = new DayForecast(12, 21, 61, 40, java.util.List.of());
        when(geo.geocode("Köln")).thenReturn(Optional.of(c));
        when(wx.forecast(c, LocalDate.of(2026, 6, 5))).thenReturn(Optional.of(f));

        WeatherService service = new WeatherService(geo, wx, clock);

        assertThat(service.getForecast("Köln", LocalDate.of(2026, 6, 5))).contains(f);
        service.getForecast("Köln", LocalDate.of(2026, 6, 5));
        verify(geo, times(1)).geocode("Köln");
    }

    @Test
    void pastDate_emptyNoCalls() {
        GeocodingPort geo = mock(GeocodingPort.class);
        WeatherForecastPort wx = mock(WeatherForecastPort.class);
        WeatherService service = new WeatherService(geo, wx, clock);

        assertThat(service.getForecast("Köln", LocalDate.of(2026, 5, 31))).isEmpty();
        verifyNoInteractions(geo, wx);
    }

    @Test
    void beyondHorizon_emptyNoCalls() {
        GeocodingPort geo = mock(GeocodingPort.class);
        WeatherForecastPort wx = mock(WeatherForecastPort.class);
        WeatherService service = new WeatherService(geo, wx, clock);

        assertThat(service.getForecast("Köln", LocalDate.of(2026, 6, 30))).isEmpty();
        verifyNoInteractions(geo, wx);
    }

    @Test
    void geocodeFails_empty() {
        GeocodingPort geo = mock(GeocodingPort.class);
        WeatherForecastPort wx = mock(WeatherForecastPort.class);
        when(geo.geocode(anyString())).thenReturn(Optional.empty());
        WeatherService service = new WeatherService(geo, wx, clock);

        assertThat(service.getForecast("Nirgendwo", LocalDate.of(2026, 6, 5))).isEmpty();
        verifyNoInteractions(wx);
    }
}
