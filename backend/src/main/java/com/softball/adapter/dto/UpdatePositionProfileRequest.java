package com.softball.adapter.dto;

import com.softball.domain.model.PositionSlot;

/** Positions-Profil eines Spielers setzen. Alle Felder optional — null löscht den Slot. */
public record UpdatePositionProfileRequest(PositionSlot primary,
                                           PositionSlot secondary,
                                           PositionSlot tertiary) {
}
