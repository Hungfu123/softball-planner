package com.softball.domain.model;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class Invitation {
    private Long id;
    private String title;
    private LocalDate letterDate;
    private LocalDate eventDate;
    private String venue;
    private PairingMode pairingMode = PairingMode.HEIM_GAST;
    private String bodyText;
    private List<String> guestTeams = new ArrayList<>();
    private List<InvitationGame> games = new ArrayList<>();
    private List<InvitationContact> contacts = new ArrayList<>();
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Invitation() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(final String title) { this.title = title; }
    public LocalDate getLetterDate() { return letterDate; }
    public void setLetterDate(final LocalDate letterDate) { this.letterDate = letterDate; }
    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(final LocalDate eventDate) { this.eventDate = eventDate; }
    public String getVenue() { return venue; }
    public void setVenue(final String venue) { this.venue = venue; }
    public PairingMode getPairingMode() { return pairingMode != null ? pairingMode : PairingMode.HEIM_GAST; }
    public void setPairingMode(final PairingMode pairingMode) { this.pairingMode = pairingMode; }
    public String getBodyText() { return bodyText; }
    public void setBodyText(final String bodyText) { this.bodyText = bodyText; }
    public List<String> getGuestTeams() { return guestTeams; }
    public void setGuestTeams(final List<String> guestTeams) { this.guestTeams = guestTeams != null ? guestTeams : new ArrayList<>(); }
    public List<InvitationGame> getGames() { return games; }
    public void setGames(final List<InvitationGame> games) { this.games = games != null ? games : new ArrayList<>(); }
    public List<InvitationContact> getContacts() { return contacts; }
    public void setContacts(final List<InvitationContact> contacts) { this.contacts = contacts != null ? contacts : new ArrayList<>(); }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(final LocalDateTime v) { this.createdAt = v; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(final LocalDateTime v) { this.updatedAt = v; }
}
