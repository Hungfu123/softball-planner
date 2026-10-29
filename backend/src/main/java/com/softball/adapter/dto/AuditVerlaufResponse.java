package com.softball.adapter.dto;

import com.softball.application.AuditService;

import java.time.Instant;
import java.util.List;

/**
 * Der Verlauf samt Auskunft darueber, ob er vollstaendig ist.
 *
 * <p>Die Antwort ist absichtlich ein Objekt und keine blanke Liste: eine Liste kann nicht sagen,
 * dass sie unvollstaendig ist. Die Oberflaeche braucht aber genau das — sonst sieht ein Superadmin
 * eine Historie, die an einer willkuerlichen Stelle aufhoert, und haelt sie fuer die ganze.
 *
 * <p>{@code bisZurueck} ist der aelteste gelieferte Zeitpunkt; alles davor fehlt. {@code null},
 * wenn nichts fehlt.
 */
public record AuditVerlaufResponse(
        List<AuditEntryResponse> eintraege,
        boolean abgeschnitten,
        Instant bisZurueck
) {
    public static AuditVerlaufResponse von(final AuditService.Verlauf verlauf) {
        return new AuditVerlaufResponse(
                verlauf.zeilen().stream().map(AuditEntryResponse::von).toList(),
                verlauf.abgeschnitten(),
                verlauf.bisZurueck());
    }
}
