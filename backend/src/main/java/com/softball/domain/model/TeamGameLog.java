package com.softball.domain.model;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Team-Offensiv-Zahlen EINES Spiels ("Game Log") — die Mannschaft als Ganzes,
 * nicht der einzelne Spieler. Heimat der Analyse "hat unser Lineup funktioniert?".
 *
 * hasAtBatData trennt gescorte Spiele von nur mit Endstand erfassten:
 * Ein Spiel mit Endstand, aber ohne At-Bat-Daten (z.B. Spielbogen-Spieldaten,
 * die bewusst nicht in diese Auswertung einfließen) bekommt keine Fake-Nullen,
 * sondern den Flag und leere Zähler.
 *
 * Innings: pro Halb-Inning die Offensiv-Zahlen. runs sind die Batting-Runs des
 * Innings (Summe runsScored über die At-Bats) — Runs durch Steal of Home sind im
 * Inning-Verlauf nicht enthalten, im effektiven Spiel-Score (scoreUs) aber schon.
 */
public record TeamGameLog(
    Long gameId,
    LocalDate date,
    String opponent,
    String league,
    Integer year,
    Integer scoreUs,
    Integer scoreThem,
    boolean hasAtBatData,
    int plateAppearances,
    int atBats,
    int hits,
    int doubles,
    int triples,
    int homeRuns,
    int walks,
    int strikeouts,
    int hitByPitch,
    /** On-Base-Gesamt: wie viele Plate Appearances eine Base erreichten (H+BB+HBP+ROE). */
    int onBase,
    int leftOnBase,
    Map<String, Integer> strandedByPlayer,
    /**
     * Wie viele Basen ein Spieler durch gegnerische Fehler gutgemacht hat
     * (At-Bats mit REACHED_ON_ERROR). Gezaehlt werden gewonnene Basen, nicht
     * Vorgaenge: wer bei einem Fehler von 1B nach 3B laeuft, bekommt 2.
     *
     * Vorsicht bei der Deutung: ein Overthrow wird im Legacy-Scoring in das
     * zuvor gebuchte At-Bat zurueckgeschrieben und traegt dessen Ergebnis. Er
     * taucht hier also unter Single/Walk/… auf, nicht unter Fehler.
     */
    Map<String, Integer> basesGainedOnErrorByPlayer,
    List<InningLog> innings
) {

    /**
     * Offensiv-Verlauf eines Halb-Innings: was haben wir dort produziert, wer blieb
     * hängen — wessen At-Bat das Inning beendet hat (outMaker, null wenn das Inning
     * ohne Out endete, z.B. erzwungener Wechsel bei Zeitablauf oder laufendes Spiel)
     * und wer in DIESEM Inning traf (hitsByPlayer — Basis für den Hit-Verlauf:
     * wer macht die Hits im Lauf des Spiels, wer nimmt ab).
     */
    public record InningLog(
        int inning,
        int runs,
        int hits,
        int onBase,
        int walks,
        int outs,
        List<String> stranded,
        String outMaker,
        Map<String, Integer> hitsByPlayer,
        List<AtBatSnippet> atBats
    ) {

        /**
         * Ein At-Bat in zeitlicher Folge innerhalb des Innings: Batter-Name,
         * Ergebnis und dabei erzielte Runs. Basis für die „Wer kam zwischen
         * Reach und Schluss-Aus"-Schlagfolge in der Analyse.
         */
        public record AtBatSnippet(String batter, AtBatResult result, int runsScored,
                                   List<RunnerAdvance> advances) {

            /**
             * Ein Laeufer, der bei diesem At-Bat weitergerueckt ist. {@code toBase}
             * 4 bedeutet Home (= Run). Abgeleitet aus dem Base-State-Diff zum
             * vorherigen At-Bat desselben Innings — das Legacy-Scoring speichert
             * keine Laeufer-Bewegungen, nur den Zustand nach jedem At-Bat.
             */
            public record RunnerAdvance(String runner, int fromBase, int toBase) {}
        }
    }
}
