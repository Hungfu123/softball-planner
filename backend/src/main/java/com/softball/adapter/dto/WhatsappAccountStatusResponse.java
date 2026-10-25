package com.softball.adapter.dto;

import com.softball.domain.model.WhatsappAccountStatus;

public record WhatsappAccountStatusResponse(boolean connected, String number, String name, boolean needsQr,
                                            String state, String lastError, String lastErrorAt,
                                            String lastPairingAt) {
    public static WhatsappAccountStatusResponse from(final WhatsappAccountStatus s) {
        return new WhatsappAccountStatusResponse(s.connected(), s.number(), s.name(), s.needsQr(),
                s.state() != null ? s.state().name() : null, s.lastError(), s.lastErrorAt(), s.lastPairingAt());
    }
}
