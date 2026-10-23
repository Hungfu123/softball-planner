package com.softball.shared.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Der zweite Waechter neben {@link SecurityCoverageTest}: eine Methodenregel ueberschreibt die
 * Klassenregel. Der Klassentest sieht das nicht, ein versehentliches
 * {@code @PreAuthorize("isAuthenticated()")} an der falschen Methode oeffnet sie fuer jeden
 * Spieler, und er bliebe gruen.
 * <p>
 * Dieser Test sammelt jede Methode, deren Regel von der Klassenregel abweicht, und vergleicht
 * sie mit {@link #ERLAUBT}. Wer eine Methode oeffnet, traegt sie dort ein, sonst scheitert der
 * Test. Die zweite Leitfrage beim Eintragen: steckt eine Trainingszahl in der Antwort? Dann
 * bleibt sie zu.
 */
class MethodSecurityCoverageTest {

    /** Fuer jeden angemeldeten Benutzer lesbar, also auch fuer Spieler. */
    private static final String OFFEN_FUER_ANGEMELDETE = "isAuthenticated()";

    /** Klasse#Methode, alle ausschliesslich lesend. Eine Zeile je geoeffneter Methode. */
    private static final Set<String> ERLAUBT = new TreeSet<>(Set.of(
        // PlayerController
        "PlayerController#getAll",
        "PlayerController#getOne",
        "PlayerController#getBattingTimeline",
        "PlayerController#getUsage",
        // SeasonController
        "SeasonController#getAll",
        "SeasonController#getById",
        "SeasonController#getStats",
        "SeasonController#getYears",
        // GameController
        "GameController#getGame",
        "GameController#getLineup",
        "GameController#getStaff",
        "GameController#getSubstitutions",
        // GameDayController
        "GameDayController#getBySeasonId",
        "GameDayController#getAll",
        "GameDayController#getById",
        "GameDayController#getLineups",
        "GameDayController#getStats",
        // LeagueTeamController
        "LeagueTeamController#getTeamDirectory",
        "LeagueTeamController#getTeams",
        "LeagueTeamController#getStandings",
        // LeagueResultController
        "LeagueResultController#getBySeasonId",
        // BattingStatsController
        "BattingStatsController#getTeamGameLogs",
        "BattingStatsController#getBattingSlots",
        "BattingStatsController#getGameStats",
        "BattingStatsController#getGameDayStats",
        "BattingStatsController#getSeasonStats",
        "BattingStatsController#getYearBattingStats",
        "BattingStatsController#getYearStats",
        "BattingStatsController#getYearSeasons",
        "BattingStatsController#getAllTimeBattingStats",
        "BattingStatsController#getAllTimeStats",
        "BattingStatsController#getOpponentBattingOverview",
        "BattingStatsController#getOpponentBattingStats",
        // AwardController
        "AwardController#getGameDayAwards",
        "AwardController#getSeasonAwards",
        "AwardController#getYearAwards",
        "AwardController#getAllTimeAwards",
        // PlayController
        "PlayController#getAll",
        "PlayController#getById",
        // PlayCategoryController
        "PlayCategoryController#getAll",
        // TrainingController
        "TrainingController#getAll",
        // ScoringController
        "ScoringController#getAtBats",
        "ScoringController#getStealingEvents",
        "ScoringController#getScoreboard"
    ));

    @Test
    void nurDieEingetragenenMethodenWeichenVonDerKlassenregelAb() throws ClassNotFoundException {
        final Set<String> abweichend = abweichendeMethoden();

        assertThat(abweichend)
                .as("Methode mit eigener @PreAuthorize-Regel, die nicht in ERLAUBT steht "
                        + "(oder umgekehrt: Eintrag ohne Methode). Wer eine Methode oeffnet, traegt sie ein.")
                .containsExactlyInAnyOrderElementsOf(ERLAUBT);
    }

    @Test
    void jedeAbweichungIstDieAngemeldetenRegelUndNichtsLockereres() throws ClassNotFoundException {
        final List<String> falscheRegeln = new ArrayList<>();
        for (final Class<?> type : produktiveController()) {
            for (final Method method : type.getDeclaredMethods()) {
                final PreAuthorize regel = AnnotatedElementUtils.findMergedAnnotation(method, PreAuthorize.class);
                if (regel != null && !OFFEN_FUER_ANGEMELDETE.equals(normiert(regel.value()))
                        && !normiert(regel.value()).equals(klassenregel(type))) {
                    falscheRegeln.add(type.getSimpleName() + "#" + method.getName() + " -> " + regel.value());
                }
            }
        }
        assertThat(falscheRegeln)
                .as("Methodenregeln, die weder die Klassenregel wiederholen noch isAuthenticated() sind "
                        + "(Scoring-Rechte kommen mit eigenem Test)")
                .isEmpty();
    }

    private static Set<String> abweichendeMethoden() throws ClassNotFoundException {
        final List<Class<?>> controller = produktiveController();

        // Gegen Leerlauf: ein Scan ohne Treffer waere sonst gruen, ohne zu pruefen.
        assertThat(controller).extracting(Class::getSimpleName)
                .contains("PlayerController", "TrainingController", "ScoringController");

        final Set<String> result = new TreeSet<>();
        for (final Class<?> type : controller) {
            final String klasse = klassenregel(type);
            for (final Method method : type.getDeclaredMethods()) {
                if (method.isSynthetic()) {
                    continue;
                }
                final PreAuthorize regel = AnnotatedElementUtils.findMergedAnnotation(method, PreAuthorize.class);
                if (regel != null && !normiert(regel.value()).equals(klasse)) {
                    result.add(type.getSimpleName() + "#" + method.getName());
                }
            }
        }
        return result;
    }

    private static String klassenregel(final Class<?> type) {
        final PreAuthorize regel = AnnotatedElementUtils.findMergedAnnotation(type, PreAuthorize.class);
        return regel == null ? null : normiert(regel.value());
    }

    private static String normiert(final String regel) {
        return regel.replaceAll("\\s+", "");
    }

    private static List<Class<?>> produktiveController() throws ClassNotFoundException {
        final ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        final List<Class<?>> result = new ArrayList<>();
        for (final BeanDefinition def : scanner.findCandidateComponents("com.softball")) {
            final Class<?> type = Class.forName(def.getBeanClassName());
            final String ort = String.valueOf(type.getProtectionDomain().getCodeSource().getLocation());
            if (!ort.contains("test-classes")) { // Probe-Controller aus Tests ausnehmen
                result.add(type);
            }
        }
        return result;
    }
}
