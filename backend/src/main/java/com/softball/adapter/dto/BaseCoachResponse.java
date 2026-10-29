package com.softball.adapter.dto;

import com.softball.domain.service.BaseCoachRegel.BaseCoachAuskunft;

import java.util.List;

/**
 * Wer an den Bases coacht — die Auskunft aus {@code BaseCoachRegel}, fuer das Frontend.
 *
 * <p>Die Feldnamen sind englisch, obwohl die Domaene deutsch spricht: {@code adapter/dto}
 * folgt der Sprache des restlichen Pakets, und das Frontend liest diese Namen.
 *
 * <p>{@code firstBase}/{@code thirdBase} sind {@code null}, wenn kein Coach benannt ist;
 * {@code startCoaches} nennt dann die Spieler, die diese Bases zu Beginn uebernehmen.
 *
 * <p>Am Sammelendpunkt gibt es einen Eintrag fuer <b>jedes</b> Spiel des Spieltags, auch fuer
 * Spiele ohne Aufstellung (dann leere {@code startCoaches}) — ein Vertrag mit dem Frontend.
 */
public record BaseCoachResponse(String firstBase, String thirdBase, List<String> startCoaches) {

    public static BaseCoachResponse from(final BaseCoachAuskunft auskunft) {
        return new BaseCoachResponse(auskunft.ersteBase(), auskunft.dritteBase(), auskunft.startCoaches());
    }
}
