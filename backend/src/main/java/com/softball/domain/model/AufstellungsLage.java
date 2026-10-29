package com.softball.domain.model;

/**
 * Wo ein Spieltag auf dem Weg zur sichtbaren Aufstellung steht. Unabhaengig davon, WER fragt —
 * deshalb steht sie am Spieltag-DTO und nicht an der Anfrage.
 *
 * <p>Die Reihenfolge der Pruefung ist Teil der Bedeutung: {@link #OFFEN_VERGANGEN} und
 * {@link #OFFEN_AB_SIEBEN} kommen vor {@link #FREIGEGEBEN}. Die Lage sagt, WARUM etwas sichtbar
 * ist; wo der Tag selbst es oeffnet, ist die Freigabe folgenlos und darf keinen
 * "zuruecknehmen"-Knopf bekommen (siehe {@code AufstellungsLageRegel}).
 */
public enum AufstellungsLage {
    /** Noch nicht freigegeben und nicht heute: nur Trainer sehen sie. */
    GESPERRT,
    /** Der Trainer hat freigegeben (und der Spieltag ist nicht vorbei). */
    FREIGEGEBEN,
    /** Heute, aber noch vor 07:00 Berliner Zeit: der Trainer baut eventuell noch um. */
    HEUTE_VOR_SIEBEN,
    /** Heute ab 07:00 Berliner Zeit, auch wenn freigegeben wurde. */
    OFFEN_AB_SIEBEN,
    /** Der Spieltag liegt hinter uns: Geschichte, keine Planung mehr. */
    OFFEN_VERGANGEN
}
