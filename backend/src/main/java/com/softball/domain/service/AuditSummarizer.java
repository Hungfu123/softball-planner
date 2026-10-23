package com.softball.domain.service;

import com.softball.domain.model.AuditEvent;
import com.softball.domain.model.AuditKind;
import com.softball.domain.model.AuditSpan;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Fasst Scoring-Zeilen beim Lesen zusammen: aufeinanderfolgende {@code SCORING}-Zeilen desselben
 * Nutzers am selben Ziel gehoeren zu einer Spanne, solange zwischen zwei Zeilen weniger als
 * {@link #MAX_LUECKE} liegen. Alle anderen Zeilen bleiben einzeln.
 * <p>
 * Der Schluessel ist der Benutzername-Schnappschuss, nicht die userId: benennt jemand sich mitten in
 * einer Spanne um, reisst sie ab. Selten und folgenlos. Die userId taugt nicht als Schluessel, weil sie
 * nach dem Loeschen eines Accounts null ist.
 */
public class AuditSummarizer {

    public static final Duration MAX_LUECKE = Duration.ofMinutes(20);

    /** @param neuesteZuerst Zeilen wie der Port sie liefert; das Ergebnis ist ebenso sortiert (nach Ende der Spanne). */
    public List<AuditSpan> zusammenfassen(final List<AuditEvent> neuesteZuerst) {
        final List<AuditSpan> ergebnis = new ArrayList<>();
        final Map<List<Object>, List<AuditEvent>> scoring = new LinkedHashMap<>();
        for (final AuditEvent e : neuesteZuerst) {
            if (e.kind() == AuditKind.SCORING) {
                scoring.computeIfAbsent(List.of(e.username(), String.valueOf(e.targetType()), String.valueOf(e.targetId())),
                        k -> new ArrayList<>()).add(e);
            } else {
                ergebnis.add(einzeln(e));
            }
        }
        for (final List<AuditEvent> reihe : scoring.values()) {
            ergebnis.addAll(spannen(reihe));
        }
        ergebnis.sort(Comparator.comparing(AuditSpan::to).reversed());
        return ergebnis;
    }

    /** Eine Reihe (gleicher Nutzer, gleiches Ziel, neueste zuerst) in Spannen schneiden. */
    private List<AuditSpan> spannen(final List<AuditEvent> neuesteZuerst) {
        final List<AuditSpan> result = new ArrayList<>();
        AuditEvent juengste = null; // neueste Zeile der laufenden Spanne
        AuditEvent aelteste = null; // aelteste Zeile der laufenden Spanne
        int anzahl = 0;
        for (final AuditEvent e : neuesteZuerst) {
            if (aelteste != null && Duration.between(e.occurredAt(), aelteste.occurredAt()).compareTo(MAX_LUECKE) < 0) {
                aelteste = e;
                anzahl++;
                continue;
            }
            if (juengste != null) {
                result.add(spanne(juengste, aelteste, anzahl));
            }
            juengste = e;
            aelteste = e;
            anzahl = 1;
        }
        if (juengste != null) {
            result.add(spanne(juengste, aelteste, anzahl));
        }
        return result;
    }

    private static AuditSpan spanne(final AuditEvent juengste, final AuditEvent aelteste, final int anzahl) {
        return new AuditSpan(juengste.username(), juengste.kind(), juengste.method(), juengste.path(),
                juengste.label(), juengste.targetType(), juengste.targetId(), juengste.status(),
                aelteste.occurredAt(), juengste.occurredAt(), anzahl);
    }

    private static AuditSpan einzeln(final AuditEvent e) {
        return spanne(e, e, 1);
    }
}
