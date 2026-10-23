package com.softball.shared.exception;

/** Kein angemeldeter Account im SecurityContext (oder der Account ist inzwischen geloescht) → 401. */
public class NichtAngemeldetException extends RuntimeException {

    public NichtAngemeldetException() {
        super("Nicht angemeldet");
    }
}
