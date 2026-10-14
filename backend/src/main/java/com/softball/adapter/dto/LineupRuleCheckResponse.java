package com.softball.adapter.dto;

import java.util.List;

/**
 * Was an einer Aufstellung gegen die Liga-Regeln spricht.
 *
 * Hinweise, keine Fehler: an einem Spieltag mit zu wenigen Frauen muss sich
 * trotzdem eine Aufstellung speichern lassen.
 */
public record LineupRuleCheckResponse(List<String> warnings, int womenOnField, int womenInInfield) {}
