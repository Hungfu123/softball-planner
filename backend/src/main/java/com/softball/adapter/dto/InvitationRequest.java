package com.softball.adapter.dto;

import com.softball.domain.model.Invitation;
import com.softball.domain.model.InvitationContact;
import com.softball.domain.model.InvitationGame;
import com.softball.domain.model.PairingMode;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.List;

public record InvitationRequest(
        @NotBlank String title,
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

    public Invitation toDomain() {
        final Invitation inv = new Invitation();
        inv.setTitle(title);
        inv.setLetterDate(letterDate);
        inv.setEventDate(eventDate);
        inv.setVenue(venue);
        inv.setPairingMode(pairingMode != null ? pairingMode : PairingMode.HEIM_GAST);
        inv.setBodyText(bodyText);
        inv.setGuestTeams(guestTeams != null ? guestTeams : List.of());
        inv.setGames(games != null ? games.stream().map(g -> {
            final InvitationGame x = new InvitationGame();
            x.setTime(g.time()); x.setTeamA(g.teamA()); x.setTeamB(g.teamB()); x.setUmp(g.ump());
            return x;
        }).toList() : List.of());
        inv.setContacts(contacts != null ? contacts.stream().map(c -> {
            final InvitationContact x = new InvitationContact();
            x.setRole(c.role()); x.setName(c.name()); x.setEmail(c.email()); x.setPhone(c.phone());
            return x;
        }).toList() : List.of());
        return inv;
    }
}
