package com.softball.adapter.dto;

import com.softball.application.UserAccountService;

import java.util.List;

/** Was die Massenanlage getan und was sie uebersprungen hat, mit Grund. */
public record BulkCreateResponse(List<Created> created, List<Skipped> skipped) {

    public record Created(Long accountId, Long playerId, String playerName, String username) {}

    public record Skipped(Long playerId, String playerName, String reason) {}

    public static BulkCreateResponse von(final UserAccountService.MassenanlageErgebnis ergebnis) {
        return new BulkCreateResponse(
                ergebnis.angelegt().stream()
                        .map(a -> new Created(a.accountId(), a.playerId(), a.playerName(), a.username())).toList(),
                ergebnis.uebersprungen().stream()
                        .map(u -> new Skipped(u.playerId(), u.playerName(), u.grund())).toList());
    }
}
