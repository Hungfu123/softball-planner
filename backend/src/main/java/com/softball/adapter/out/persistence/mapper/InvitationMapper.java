package com.softball.adapter.out.persistence.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.softball.adapter.out.persistence.entity.InvitationEntity;
import com.softball.domain.model.Invitation;
import com.softball.domain.model.InvitationContact;
import com.softball.domain.model.InvitationGame;
import com.softball.domain.model.PairingMode;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class InvitationMapper {

    private final ObjectMapper objectMapper;

    public InvitationMapper(final ObjectMapper objectMapper) {
        this.objectMapper = objectMapper.copy()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public Invitation toDomain(final InvitationEntity e) {
        if (e == null) return null;
        final Invitation inv = new Invitation();
        inv.setId(e.getId());
        inv.setTitle(e.getTitle());
        inv.setLetterDate(e.getLetterDate());
        inv.setEventDate(e.getEventDate());
        inv.setVenue(e.getVenue());
        inv.setPairingMode(e.getPairingMode() != null ? e.getPairingMode() : PairingMode.HEIM_GAST);
        inv.setBodyText(e.getBodyText());
        inv.setGuestTeams(readList(e.getGuestTeams(), new TypeReference<List<String>>() {}));
        inv.setGames(readList(e.getGames(), new TypeReference<List<InvitationGame>>() {}));
        inv.setContacts(readList(e.getContacts(), new TypeReference<List<InvitationContact>>() {}));
        inv.setCreatedAt(e.getCreatedAt());
        inv.setUpdatedAt(e.getUpdatedAt());
        return inv;
    }

    public InvitationEntity toEntity(final Invitation inv) {
        if (inv == null) return null;
        final InvitationEntity e = new InvitationEntity();
        e.setId(inv.getId());
        applyScalars(e, inv);
        return e;
    }

    public void updateEntity(final InvitationEntity e, final Invitation inv) {
        applyScalars(e, inv);
    }

    private void applyScalars(final InvitationEntity e, final Invitation inv) {
        e.setTitle(inv.getTitle());
        e.setLetterDate(inv.getLetterDate());
        e.setEventDate(inv.getEventDate());
        e.setVenue(inv.getVenue());
        e.setPairingMode(inv.getPairingMode());
        e.setBodyText(inv.getBodyText());
        e.setGuestTeams(write(inv.getGuestTeams()));
        e.setGames(write(inv.getGames()));
        e.setContacts(write(inv.getContacts()));
    }

    private <T> List<T> readList(final String json, final TypeReference<List<T>> type) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, type);
        } catch (final JsonProcessingException ex) {
            throw new RuntimeException("Failed to deserialize invitation json", ex);
        }
    }

    private String write(final Object value) {
        try {
            return objectMapper.writeValueAsString(value != null ? value : List.of());
        } catch (final JsonProcessingException ex) {
            throw new RuntimeException("Failed to serialize invitation json", ex);
        }
    }
}
