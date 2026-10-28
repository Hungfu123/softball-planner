package com.softball.domain.model;

/**
 * Wo ein Spieltag auf dem Weg zur sichtbaren Aufstellung steht. Unabhaengig davon, WER fragt —
 * deshalb steht sie am Spieltag-DTO und nicht an der Anfrage.
 *
 * <p>Die Reihenfolge der Pruefung ist Teil der Bedeutung: {@link #OFFEN_VERGANGEN} kommt vor
 * {@link #FREIGEGEBEN}, damit ein gespielter Spieltag nie als "freigegeben" gilt (der haette
 * sonst fuer immer einen "zuruecknehmen"-Knopf und bliebe fuer Spieler der naechste Spieltag).
 */
public enum AufstellungsLage {
    /** Noch nicht freigegeben und nicht heute: nur Trainer sehen sie. */
    GESPERRT,
    /** Der Trainer hat freigegeben (und der Spieltag ist nicht vorbei). */
    FREIGEGEBEN,
    /** Heute, aber noch vor 07:00 Berliner Zeit: der Trainer baut eventuell noch um. */
    HEUTE_VOR_SIEBEN,
    /** Heute ab 07:00 Berliner Zeit, ohne dass freigegeben wurde. */
    OFFEN_AB_SIEBEN,
    /** Der Spieltag liegt hinter uns: Geschichte, keine Planung mehr. */
    OFFEN_VERGANGEN
}
