package com.softball.adapter.in.web;

import org.springframework.security.access.prepost.PreAuthorize;
import com.softball.adapter.dto.WeatherResponse;
import com.softball.application.GameDayService;
import com.softball.application.TrainingService;
import com.softball.application.WeatherService;
import com.softball.domain.model.DayForecast;
import com.softball.domain.model.GameDay;
import com.softball.domain.model.Training;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Optional;

@PreAuthorize("hasRole('ADMIN')")
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

    /**
     * Offen fuer jeden Angemeldeten: die Startseite zeigt die Wetterzeile unter dem naechsten
     * Spieltag, und die Startseite gehoert allen. Mit der Klassenregel lief der Abruf fuer
     * Spieler ins 403, der Fehler fiel in den {@code catch} der Kachel und die Zeile blieb
     * stillschweigend weg — niemand sah einen Fehler, nur kein Wetter.
     * <p>
     * Die Antwort traegt Temperatur, Regenwahrscheinlichkeit und WMO-Code, sonst nichts: keinen
     * Ort, keinen Namen, keine Aufstellung. Dass an diesem Tag gespielt wird, weiss der Spieler
     * ohnehin — {@code /api/gamedays} ist fuer ihn offen. Die Freigabegrenze beruehrt das nicht,
     * sie haengt an Aufstellungsdaten, und hier sind keine.
     */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/api/gamedays/{gameDayId}/weather")
    public ResponseEntity<WeatherResponse> getWeather(@PathVariable final Long gameDayId) {
        final GameDay gd = gameDayService.findById(gameDayId);
        return antwort(gd.getLocation(), gd.getDate());
    }

    /** Dasselbe fuer das naechste Training — die Kachel daneben, derselbe Grund. */
    @PreAuthorize("isAuthenticated()")
    @GetMapping("/api/trainings/{trainingId}/weather")
    public ResponseEntity<WeatherResponse> getTrainingWeather(@PathVariable final Long trainingId) {
        final Training t = trainingService.findById(trainingId);
        return antwort(t.getLocation(), t.getDate());
    }

    /**
     * Wetter am Ort des Termins — und wenn es den nicht gibt, am Heimatort.
     * <p>
     * ZWEI Faelle fallen auf denselben Ausweg, und der zweite ist der haeufigere: kein Ort
     * eingetragen, und ein Ort, den die Ortssuche nicht kennt. Trainingsorte sind
     * Gebaeudenamen — „Grundschule Paul Klee" ist kein Ortsname, die Ortssuche gibt dafuer
     * nichts zurueck, und die Wetterzeile fiel weg. Das ist die falsche Antwort auf die
     * Frage, die sie beantwortet: „regnet es Donnerstag?" haengt nicht am Gebaeude.
     * Trainiert wird in Duesseldorf, in welcher Halle auch immer.
     * <p>
     * Der zweite Versuch kostet nichts: der {@code geoCache} merkt sich auch das
     * ergebnislose Nachschlagen, und die Vorhersage zum Heimatort liegt nach dem ersten
     * Abruf ohnehin im Cache. Faellt die Ortssuche fuer einen ECHTEN Ort aus, liefert die
     * Zeile das Wetter der Heimat statt gar keins — besser als eine leere Kachel, und der
     * Unterschied zwischen zwei Orten derselben Gegend ist kleiner als der zwischen einer
     * Angabe und keiner.
     */
    private ResponseEntity<WeatherResponse> antwort(final String ort, final LocalDate datum) {
        final boolean eigenerOrt = ort != null && !ort.isBlank() && !ort.equals(defaultLocation);
        return (eigenerOrt ? weatherService.getForecast(ort, datum) : Optional.<DayForecast>empty())
            .or(() -> weatherService.getForecast(defaultLocation, datum))
            .map(WeatherResponse::from)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
