package com.softball.adapter.dto;

import com.softball.domain.model.WhatsappAccountStatus;

public record WhatsappAccountStatusResponse(boolean connected, String number, boolean needsQr) {
    public static WhatsappAccountStatusResponse from(final WhatsappAccountStatus s) {
        return new WhatsappAccountStatusResponse(s.connected(), s.number(), s.needsQr());
    }
}
