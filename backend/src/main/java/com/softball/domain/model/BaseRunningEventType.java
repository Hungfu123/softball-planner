package com.softball.domain.model;

public enum BaseRunningEventType {
    STOLEN_BASE, CAUGHT_STEALING;

    public String displayNameDe() {
        return switch (this) {
            case STOLEN_BASE -> "Stolen Base";
            case CAUGHT_STEALING -> "Caught Stealing";
        };
    }
}
