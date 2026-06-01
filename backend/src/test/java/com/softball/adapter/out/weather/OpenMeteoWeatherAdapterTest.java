package com.softball.adapter.out.weather;

import com.softball.domain.model.Coordinates;
import com.softball.domain.model.DayForecast;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class OpenMeteoWeatherAdapterTest {

    private MockRestServiceServer server;
    private OpenMeteoWeatherAdapter adapter;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        adapter = new OpenMeteoWeatherAdapter(builder);
    }

    @Test
    void forecast_windowEightToEighteen_minMaxAndRain() {
        String json = "{\"hourly\":{"
            + "\"time\":[\"2026-06-05T07:00\",\"2026-06-05T08:00\",\"2026-06-05T13:00\",\"2026-06-05T18:00\",\"2026-06-05T19:00\"],"
            + "\"temperature_2m\":[10.0,12.0,21.4,17.0,30.0],"
            + "\"precipitation_probability\":[5,10,40,20,99],"
            + "\"weather_code\":[1,2,61,3,95]}}";
        server.expect(requestTo(containsString("latitude=50.93")))
            .andExpect(method(HttpMethod.GET))
            .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        Optional<DayForecast> f = adapter.forecast(new Coordinates(50.93, 6.95), LocalDate.of(2026, 6, 5));

        assertThat(f).isPresent();
        assertThat(f.get().tempMin()).isEqualTo(12);
        assertThat(f.get().tempMax()).isEqualTo(21);
        assertThat(f.get().precipitationProbabilityPct()).isEqualTo(40);
        assertThat(f.get().wmoCode()).isEqualTo(61);
    }

    @Test
    void forecast_emptyWindow_empty() {
        String json = "{\"hourly\":{\"time\":[\"2026-06-05T05:00\"],"
            + "\"temperature_2m\":[8.0],\"precipitation_probability\":[0],\"weather_code\":[0]}}";
        server.expect(requestTo(containsString("latitude=")))
            .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));
        assertThat(adapter.forecast(new Coordinates(1, 2), LocalDate.of(2026, 6, 5))).isEmpty();
    }
}
