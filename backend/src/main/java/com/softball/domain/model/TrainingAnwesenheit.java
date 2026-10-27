package com.softball.domain.model;

import java.util.Map;

/**
 * Die Trainings-Anwesenheit eines Spielers: das Jahr in Monaten, und wie lange er schon weg ist.
 *
 * @param monate          Monat (1..12) auf Anzahl besuchter Trainings. Ein Monat ohne Anwesenheit
 *                        fehlt, statt mit einer Null dazustehen — „nicht da" und „nichts angesetzt"
 *                        sind verschiedene Aussagen, und welche gilt, weiss der Terminplan.
 * @param verpasstSeitdem Wie viele Termine seit dem letzten Mal gelaufen sind, zu denen der ganze
 *                        Kader geladen war. {@code null}, wenn jemand noch NIE da war: „lange nicht
 *                        gesehen" ist die falsche Ansprache fuer einen, den es noch nie gab.
 */
public record TrainingAnwesenheit(Map<Integer, Integer> monate, Integer verpasstSeitdem) {
}
