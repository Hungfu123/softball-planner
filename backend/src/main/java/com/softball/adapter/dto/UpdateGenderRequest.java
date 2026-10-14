package com.softball.adapter.dto;

import com.softball.domain.model.Gender;

/** {@code null} loescht die Zuordnung — dann zaehlt der Spieler fuer keine Quote. */
public record UpdateGenderRequest(Gender gender) {}
