package com.softball.domain.port.out;

import com.softball.domain.model.AuditEvent;
import com.softball.domain.model.AuditQuery;

import java.time.Instant;
import java.util.List;

public interface AuditEventRepository {

    AuditEvent save(AuditEvent event);

    /**
     * Neueste zuerst, hoechstens {@code hoechstens} Stueck.
     *
     * <p>Die Grenze ist kein Blaettern: wer mehr will, engt den Zeitraum ein. Sie ist da, damit
     * eine Abfrage ohne Zeitraum nicht zwoelf Monate am Stueck zieht.
     */
    List<AuditEvent> find(AuditQuery query, int hoechstens);

    /** Loescht alles, was vor dem Zeitpunkt liegt; liefert die Anzahl. */
    long deleteOlderThan(Instant cutoff);
}
