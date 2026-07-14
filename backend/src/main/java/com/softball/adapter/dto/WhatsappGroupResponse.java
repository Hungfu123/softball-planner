package com.softball.adapter.dto;

import com.softball.domain.model.WhatsappGroup;

public record WhatsappGroupResponse(String id, String name) {
    public static WhatsappGroupResponse from(final WhatsappGroup g) {
        return new WhatsappGroupResponse(g.id(), g.name());
    }
}
