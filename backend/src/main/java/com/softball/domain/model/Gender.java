package com.softball.domain.model;

/**
 * Geschlecht eines Spielers — gepflegt fuer die Quoten der Liga.
 *
 * Nullable: wer nicht zugeordnet ist, zaehlt nirgends mit, statt stillschweigend
 * als Mann zu gelten.
 *
 * DIVERSE ist die dritte amtliche Angabe (§22 Abs. 3 PStG). Fuer die Frauen-Quote
 * zaehlt sie nicht — die Liga-Regel spricht von Frauen, und was sonst gilt,
 * entscheidet der Verband, nicht diese App.
 */
public enum Gender {
    FEMALE, MALE, DIVERSE;

    public String displayName() {
        return switch (this) {
            case FEMALE -> "weiblich";
            case MALE -> "männlich";
            case DIVERSE -> "divers";
        };
    }
}
