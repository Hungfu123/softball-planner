package com.softball.domain.model;

public enum BaseRunningEventType {
    /** Runner klaut eine Base während eines Pitches (ohne dass Ball geschlagen wird). */
    STOLEN_BASE,
    /** Runner wird beim Klau-Versuch gefangen. Zählt als Out + CS-Stat. */
    CAUGHT_STEALING,
    /** Runner wird bei einem Out-Play (Grounder/Fly) ausgespielt — kein Steal-Versuch.
     *  Zählt als Out für den Inning-Counter, aber NICHT als Caught-Stealing in Stats. */
    OUT_ON_PLAY,
    /** Pickoff: Runner stand zu weit ab von Base, Pitcher/Catcher tagt ihn ohne Steal-Versuch.
     *  Zählt als Out + eigener Pickoff-Stat. KEIN Caught-Stealing (kein Steal-Versuch). */
    PICKOFF;

    public String displayNameDe() {
        return switch (this) {
            case STOLEN_BASE -> "Stolen Base";
            case CAUGHT_STEALING -> "Caught Stealing";
            case OUT_ON_PLAY -> "Ausgespielt";
            case PICKOFF -> "Pickoff";
        };
    }
}
