package com.softball.shared.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.RegexPatternTypeFilter;
import org.springframework.scheduling.annotation.Scheduled;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link CurrentUser} ist {@code @RequestScope}: der Scoped-Proxy entsteht auch in einem
 * {@code @Scheduled}-Bean ohne Fehler, erst der erste Aufruf ausserhalb einer Anfrage wirft.
 * Dieser Test faengt das im CI ab. Bewusst eng: nur Klassen mit {@code @Scheduled}-Methode.
 */
class CurrentUserArchitectureTest {

    @Test
    void geplanteLaeufeHabenKeinCurrentUser() throws Exception {
        final List<Class<?>> geplant = geplanteKlassen();

        // Gegen Leerlauf: die beiden heutigen Scheduler muessen gefunden werden.
        assertThat(geplant).extracting(Class::getSimpleName)
                .contains("WhatsappPollScheduler", "PollVoteSyncService");
        assertThat(geplant)
                .filteredOn(CurrentUserArchitectureTest::referenziertCurrentUser)
                .as("Klassen mit @Scheduled duerfen CurrentUser nicht referenzieren (nur in HTTP-Anfragen nutzbar)")
                .isEmpty();
    }

    /**
     * Der direkte Test oben sieht nur Felder und Konstruktoren der geplanten Klasse selbst. Ein Lauf,
     * der ueber einen Service indirekt an CurrentUser kaeme, rutschte durch. Dieser Test folgt den
     * Konstruktor-Abhaengigkeiten der Audit-Aufraeumer bis in die eigenen Pakete.
     */
    @Test
    void derHistorienAufraeumerErreichtCurrentUserAuchIndirektNicht() throws Exception {
        final List<Class<?>> aufraeumer = geplanteKlassen().stream()
                .filter(c -> c.getName().contains("AuditCleanup")).toList();
        assertThat(aufraeumer).as("Gegen Leerlauf: der Aufraeum-Lauf muss gefunden werden").hasSize(1);

        assertThat(erreichtCurrentUser(aufraeumer.get(0), new java.util.HashSet<>()))
                .as("Der Aufraeum-Lauf laeuft ausserhalb jeder Anfrage: kein Weg zu CurrentUser, auch nicht ueber Services")
                .isFalse();
    }

    private static boolean erreichtCurrentUser(final Class<?> type, final java.util.Set<Class<?>> besucht) {
        if (type == CurrentUser.class) {
            return true;
        }
        if (!type.getName().startsWith("com.softball") || !besucht.add(type)) {
            return false;
        }
        for (final Constructor<?> c : type.getDeclaredConstructors()) {
            for (final Class<?> p : c.getParameterTypes()) {
                if (erreichtCurrentUser(p, besucht)) {
                    return true;
                }
            }
        }
        for (final Field f : type.getDeclaredFields()) {
            if (erreichtCurrentUser(f.getType(), besucht)) {
                return true;
            }
        }
        return false;
    }

    private static List<Class<?>> geplanteKlassen() throws ClassNotFoundException {
        final ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new RegexPatternTypeFilter(Pattern.compile(".*")));
        final List<Class<?>> result = new java.util.ArrayList<>();
        for (final BeanDefinition def : scanner.findCandidateComponents("com.softball")) {
            final Class<?> type = Class.forName(def.getBeanClassName());
            final boolean geplant = Arrays.stream(type.getDeclaredMethods())
                    .anyMatch(m -> m.isAnnotationPresent(Scheduled.class));
            if (geplant) {
                result.add(type);
            }
        }
        return result;
    }

    private static boolean referenziertCurrentUser(final Class<?> type) {
        for (final Field f : type.getDeclaredFields()) {
            if (f.getType() == CurrentUser.class) {
                return true;
            }
        }
        for (final Constructor<?> c : type.getDeclaredConstructors()) {
            if (Arrays.asList(c.getParameterTypes()).contains(CurrentUser.class)) {
                return true;
            }
        }
        for (final Method m : type.getDeclaredMethods()) {
            if (Arrays.asList(m.getParameterTypes()).contains(CurrentUser.class)) {
                return true;
            }
        }
        return false;
    }
}
