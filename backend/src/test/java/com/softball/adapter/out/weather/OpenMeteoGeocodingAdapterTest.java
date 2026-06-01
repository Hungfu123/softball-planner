package com.softball.adapter.out.weather;

import com.softball.domain.model.Coordinates;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class OpenMeteoGeocodingAdapterTest {

    private MockRestServiceServer server;
    private OpenMeteoGeocodingAdapter adapter;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        adapter = new OpenMeteoGeocodingAdapter(builder);
    }

    @Test
    void geocode_returnsCoordinates() {
        server.expect(requestTo(containsString("name=K%C3%B6ln")))
            .andExpect(method(HttpMethod.GET))
            .andRespond(withSuccess(
                "{\"results\":[{\"latitude\":50.93,\"longitude\":6.95}]}",
                MediaType.APPLICATION_JSON));

        Optional<Coordinates> result = adapter.geocode("Köln");

        assertThat(result).isPresent();
        assertThat(result.get().latitude()).isEqualTo(50.93);
        assertThat(result.get().longitude()).isEqualTo(6.95);
    }

    @Test
    void geocode_noResults_empty() {
        server.expect(requestTo(containsString("name=")))
            .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        assertThat(adapter.geocode("xyzkeintreffer")).isEmpty();
    }

    @Test
    void geocode_blankInput_empty() {
        assertThat(adapter.geocode("  ")).isEmpty();
        assertThat(adapter.geocode(null)).isEmpty();
    }
}
