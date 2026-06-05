package com.softball.adapter.dto;

import com.softball.domain.model.Invitation;
import com.softball.domain.model.PairingMode;

import java.time.LocalDate;
import java.util.List;

public record InvitationResponse(
        Long id,
        String title,
        LocalDate letterDate,
        LocalDate eventDate,
        String venue,
        PairingMode pairingMode,
        String bodyText,
        List<String> guestTeams,
        List<GameDto> games,
        List<ContactDto> contacts) {

    public record GameDto(String time, String teamA, String teamB, String ump) {}
    public record ContactDto(String role, String name, String email, String phone) {}

    public static InvitationResponse from(final Invitation i) {
        return new InvitationResponse(
            i.getId(), i.getTitle(), i.getLetterDate(), i.getEventDate(), i.getVenue(),
            i.getPairingMode(), i.getBodyText(), i.getGuestTeams(),
            i.getGames().stream().map(g -> new GameDto(g.getTime(), g.getTeamA(), g.getTeamB(), g.getUmp())).toList(),
            i.getContacts().stream().map(c -> new ContactDto(c.getRole(), c.getName(), c.getEmail(), c.getPhone())).toList()
        );
    }
}
