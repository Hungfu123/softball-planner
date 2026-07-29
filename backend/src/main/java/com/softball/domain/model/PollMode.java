package com.softball.domain.model;

/** Versand- und Kopplungsart einer WhatsApp-Umfrage. */
public enum PollMode {
    /** An einen Trainings-Wochentag gekoppelt, sendet wiederkehrend am Vortag. */
    TRAINING,
    /** Einmalig zu einem festen Datum, ohne Kopplung. */
    ONE_OFF,
    /** Einmalig zu einem festen Datum, an einen Spieltag gekoppelt. */
    GAME_DAY
}
