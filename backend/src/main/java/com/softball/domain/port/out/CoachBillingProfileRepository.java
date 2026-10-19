package com.softball.domain.port.out;

import com.softball.domain.model.CoachBillingProfile;

import java.util.Optional;

public interface CoachBillingProfileRepository {

    /** Leer, solange niemand die Stammdaten eingetragen hat — kein Fehler, ein Zustand. */
    Optional<CoachBillingProfile> find();

    CoachBillingProfile save(CoachBillingProfile profile);
}
