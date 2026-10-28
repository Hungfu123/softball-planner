package com.softball.domain.service;

import com.softball.domain.model.GameStaff;
import com.softball.domain.model.LineupEntry;
import com.softball.domain.model.Player;
import com.softball.domain.model.Substitution;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.Stream;

/**
 * Macht aus der Aufstellung eines Spieltags eine Zeichenkette fester Laenge: gleiche
 * Aufstellung, gleicher Abdruck, egal in welcher Reihenfolge die Listen ankommen.
 *
 * <p>Je Spiel gehen {@code spiel:schlagplatz:spieler:position:dh} je Eintrag, {@code spiel:rolle:spieler}
 * je Coach und {@code spiel:inning:raus:rein} je Auswechslung ein. Jede Gruppe wird
 * <b>sortiert</b>, weil die Datenbank keine Reihenfolge zusichert und eine umsortierte
 * Antwort sonst als Aenderung gaelte. Gespeichert wird ein SHA-256 in Hex — die
 * Zeichenkette selbst kann lang werden und niemand liest sie.
 *
 * <p>Ein Vergleich statt eines zweiten Zeitstempels: der muesste von jeder Schreibstelle
 * gesetzt werden, und eine vergessene ergaebe einen Haken, der stillschweigend falsch
 * steht. Der Abdruck kann nichts vergessen und faengt auch das Loeschen.
 */
public final class AufstellungsFingerabdruck {

    private AufstellungsFingerabdruck() {}

    public static String von(final List<LineupEntry> lineup, final List<GameStaff> staff,
                             final List<Substitution> subs) {
        final List<String> teile = new ArrayList<>();
        teile.addAll(sortiert(lineup.stream().map(AufstellungsFingerabdruck::zeile)));
        teile.addAll(sortiert(staff.stream().map(AufstellungsFingerabdruck::zeile)));
        teile.addAll(sortiert(subs.stream().map(AufstellungsFingerabdruck::zeile)));
        return sha256Hex(String.join("\n", teile));
    }

    private static List<String> sortiert(final Stream<String> zeilen) {
        final List<String> liste = new ArrayList<>(zeilen.toList());
        Collections.sort(liste);
        // Gruppen-Marker: ohne ihn liessen sich Eintrag und Coach mit gleichem Text verwechseln.
        liste.add(0, "#" + liste.size());
        return liste;
    }

    private static String zeile(final LineupEntry e) {
        return "L:" + spielId(e.getGame()) + ":" + e.getBattingOrder() + ":" + id(e.getPlayer())
            + ":" + e.getPosition() + ":" + id(e.getDhBatterPlayer());
    }

    private static String zeile(final GameStaff s) {
        return "S:" + spielId(s.getGame()) + ":" + s.getRole() + ":" + id(s.getPlayer());
    }

    private static String zeile(final Substitution s) {
        return "W:" + spielId(s.getGame()) + ":" + s.getInning()
            + ":" + id(s.getPlayerOut()) + ":" + id(s.getPlayerIn());
    }

    private static Object spielId(final com.softball.domain.model.Game game) {
        return game != null ? game.getId() : null;
    }

    private static Object id(final Player player) {
        return player != null ? player.getId() : null;
    }

    private static String sha256Hex(final String text) {
        try {
            final byte[] digest = MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (final NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 fehlt in der JVM", e);
        }
    }
}
