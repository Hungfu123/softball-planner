package com.softball.adapter.in.web;

import com.softball.adapter.dto.WeatherResponse;
import com.softball.application.GameDayService;
import com.softball.application.TrainingService;
import com.softball.application.WeatherService;
import com.softball.domain.model.DayForecast;
import com.softball.domain.model.GameDay;
import com.softball.domain.model.Training;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

/**
 * Der Ausweg auf den Heimatort. Trainingsorte sind Gebaeudenamen — „Grundschule Paul Klee"
 * kennt keine Ortssuche, und ohne diesen Ausweg fiel die Wetterzeile stillschweigend weg.
 */
class WeatherControllerTest {

    private static final String HEIMAT = "Düsseldorf";
    private static final LocalDate TAG = LocalDate.of(2026, 6, 5);
    private static final DayForecast VORHERSAGE = new DayForecast(12, 21, 61, 40, List.of());

    private final WeatherService wetter = mock(WeatherService.class);
    private final GameDayService spieltage = mock(GameDayService.class);
    private final TrainingService trainings = mock(TrainingService.class);
    private final WeatherController controller =
        new WeatherController(wetter, spieltage, trainings, HEIMAT);

    private void training(final String ort) {
        final Training t = mock(Training.class);
        when(t.getLocation()).thenReturn(ort);
        when(t.getDate()).thenReturn(TAG);
        when(trainings.findById(1L)).thenReturn(t);
    }

    private void spieltag(final String ort) {
        final GameDay gd = mock(GameDay.class);
        when(gd.getLocation()).thenReturn(ort);
        when(gd.getDate()).thenReturn(TAG);
        when(spieltage.findById(1L)).thenReturn(gd);
    }

    @Test
    void kennbarerOrtWirdGenommen() {
        training("Köln");
        when(wetter.getForecast("Köln", TAG)).thenReturn(Optional.of(VORHERSAGE));

        assertThat(controller.getTrainingWeather(1L).getBody()).isEqualTo(WeatherResponse.from(VORHERSAGE));
        verify(wetter).getForecast("Köln", TAG);
        verifyNoMoreInteractions(wetter);
    }

    @Test
    void unbekannterOrtFaelltAufDieHeimatZurueck() {
        training("Grundschule Paul Klee");
        when(wetter.getForecast("Grundschule Paul Klee", TAG)).thenReturn(Optional.empty());
        when(wetter.getForecast(HEIMAT, TAG)).thenReturn(Optional.of(VORHERSAGE));

        assertThat(controller.getTrainingWeather(1L).getBody()).isEqualTo(WeatherResponse.from(VORHERSAGE));
    }

    @Test
    void ohneOrtDirektDieHeimat() {
        spieltag("   ");
        when(wetter.getForecast(HEIMAT, TAG)).thenReturn(Optional.of(VORHERSAGE));

        assertThat(controller.getWeather(1L).getBody()).isEqualTo(WeatherResponse.from(VORHERSAGE));
        verify(wetter).getForecast(HEIMAT, TAG);
        verifyNoMoreInteractions(wetter);
    }

    /** Ist der Ort schon die Heimat, waere der zweite Versuch derselbe Aufruf. */
    @Test
    void heimatWirdNichtZweimalGefragt() {
        spieltag(HEIMAT);
        when(wetter.getForecast(HEIMAT, TAG)).thenReturn(Optional.empty());

        final ResponseEntity<WeatherResponse> antwort = controller.getWeather(1L);

        assertThat(antwort.getStatusCode().value()).isEqualTo(204);
        verify(wetter).getForecast(HEIMAT, TAG);
        verifyNoMoreInteractions(wetter);
    }

    /** Auch die Heimat kann ausfallen — dann bleibt es bei 204, und die Kachel laesst die Zeile weg. */
    @Test
    void findetAuchDieHeimatNichts_dann204() {
        training("Grundschule Paul Klee");
        when(wetter.getForecast("Grundschule Paul Klee", TAG)).thenReturn(Optional.empty());
        when(wetter.getForecast(HEIMAT, TAG)).thenReturn(Optional.empty());

        assertThat(controller.getTrainingWeather(1L).getStatusCode().value()).isEqualTo(204);
    }
}
