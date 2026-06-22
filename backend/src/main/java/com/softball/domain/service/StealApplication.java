package com.softball.domain.service;

import com.softball.domain.model.BaseState;

/** Ergebnis einer Stealing-Event-Anwendung: neuer State, dabei erzielte Runs, scorende Player-ID. */
public record StealApplication(BaseState state, int runs, Long scorerId) {}
