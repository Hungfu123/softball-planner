package com.softball.shared.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Default-Deny: jeder {@code @RestController} traegt eine Klassen-{@code @PreAuthorize}.
 * Ein neuer Controller ohne Regel laesst den Test scheitern, statt stillschweigend fuer
 * jeden Angemeldeten offen zu sein.
 */
class SecurityCoverageTest {

    private static final String ADMIN_REGEL = "hasRole('ADMIN')";
    private static final String OFFEN = "permitAll()";

    @Test
    void jederControllerAusserDemKalenderTraegtExaktDieAdminRegel() throws Exception {
        final List<Class<?>> controller = produktiveController();

        // Gegen Leerlauf: ein Scan ohne Treffer waere sonst gruen, ohne zu pruefen.
        assertThat(controller).extracting(Class::getSimpleName)
                .contains("PlayerController", "GameController", "ScoringController", "CalendarController");

        assertThat(controller)
                .filteredOn(c -> !"CalendarController".equals(c.getSimpleName()))
                .filteredOn(c -> !ADMIN_REGEL.equals(regel(c)))
                .as("@RestController ohne exakt @PreAuthorize(\"hasRole('ADMIN')\") auf der Klasse "
                        + "(Default-Deny; Lockerungen gehoeren an einzelne Methoden)")
                .isEmpty();
    }

    @Test
    void nurDerKalenderIstBewusstOffen() throws Exception {
        final List<String> offen = produktiveController().stream()
                .filter(c -> OFFEN.equals(regel(c)))
                .map(Class::getSimpleName)
                .toList();

        assertThat(offen).containsExactly("CalendarController");
    }

    /** Wert der Klassenregel, ueber Meta-Annotationen hinweg und ohne Leerraum; null wenn keine da ist. */
    private static String regel(final Class<?> type) {
        final PreAuthorize regel = AnnotatedElementUtils.findMergedAnnotation(type, PreAuthorize.class);
        return regel == null ? null : regel.value().replaceAll("\\s+", "");
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
