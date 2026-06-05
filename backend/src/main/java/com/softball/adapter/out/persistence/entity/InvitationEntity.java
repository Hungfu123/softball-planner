package com.softball.adapter.out.persistence.entity;

import com.softball.domain.model.PairingMode;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "invitations")
public class InvitationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(name = "letter_date")
    private LocalDate letterDate;

    @Column(name = "event_date")
    private LocalDate eventDate;

    @Column(length = 200)
    private String venue;

    @Enumerated(EnumType.STRING)
    @Column(name = "pairing_mode", nullable = false, length = 10)
    private PairingMode pairingMode = PairingMode.HEIM_GAST;

    @Column(name = "body_text", columnDefinition = "text")
    private String bodyText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "guest_teams", columnDefinition = "jsonb", nullable = false)
    private String guestTeams = "[]";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "games", columnDefinition = "jsonb", nullable = false)
    private String games = "[]";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "contacts", columnDefinition = "jsonb", nullable = false)
    private String contacts = "[]";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        final LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(final String title) { this.title = title; }
    public LocalDate getLetterDate() { return letterDate; }
    public void setLetterDate(final LocalDate v) { this.letterDate = v; }
    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(final LocalDate v) { this.eventDate = v; }
    public String getVenue() { return venue; }
    public void setVenue(final String venue) { this.venue = venue; }
    public PairingMode getPairingMode() { return pairingMode; }
    public void setPairingMode(final PairingMode v) { this.pairingMode = v; }
    public String getBodyText() { return bodyText; }
    public void setBodyText(final String v) { this.bodyText = v; }
    public String getGuestTeams() { return guestTeams; }
    public void setGuestTeams(final String v) { this.guestTeams = v; }
    public String getGames() { return games; }
    public void setGames(final String v) { this.games = v; }
    public String getContacts() { return contacts; }
    public void setContacts(final String v) { this.contacts = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(final LocalDateTime v) { this.createdAt = v; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(final LocalDateTime v) { this.updatedAt = v; }
}
