package com.softball.domain.model;

/**
 * Zeitraum fuer das Einsatz-Profil: alles, ein Kalenderjahr oder eine Saison.
 *
 * Trainings haengen an keiner Saison — sie laufen quer durch Hallen- und Feldzeit.
 * Im Saison-Zuschnitt bleiben sie deshalb aussen vor, statt sie ueber ein geratenes
 * Datumsfenster hineinzurechnen.
 */
public record UsageScope(Integer year, Long seasonId) {

    public static UsageScope all() {
        return new UsageScope(null, null);
    }

    public static UsageScope ofYear(final int year) {
        return new UsageScope(year, null);
    }

    public static UsageScope ofSeason(final long seasonId) {
        return new UsageScope(null, seasonId);
    }

    public boolean coversTrainings() {
        return seasonId == null;
    }
}
