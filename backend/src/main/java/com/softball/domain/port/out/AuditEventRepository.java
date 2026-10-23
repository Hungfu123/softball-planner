package com.softball.domain.port.out;

import com.softball.domain.model.AuditEvent;
import com.softball.domain.model.AuditQuery;

import java.time.Instant;
import java.util.List;

public interface AuditEventRepository {

    AuditEvent save(AuditEvent event);

    /** Neueste zuerst. */
    List<AuditEvent> find(AuditQuery query);

    /** Loescht alles, was vor dem Zeitpunkt liegt; liefert die Anzahl. */
    long deleteOlderThan(Instant cutoff);
}
