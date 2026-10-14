package com.softball.adapter.out.persistence.entity;

import com.softball.domain.model.PositionSlot;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "players")
public class PlayerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private boolean regular = false;

    @Column(name = "default_batting_order")
    private Integer defaultBattingOrder;

    @Column(name = "whatsapp_name")
    private String whatsappName;

    @Column(nullable = false)
    private boolean archived = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "primary_position")
    private PositionSlot primaryPosition;

    @Enumerated(EnumType.STRING)
    @Column(name = "secondary_position")
    private PositionSlot secondaryPosition;

    @Enumerated(EnumType.STRING)
    @Column(name = "tertiary_position")
    private PositionSlot tertiaryPosition;

    public PlayerEntity() {}

    public PlayerEntity(String name) {
        this.name = name;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public boolean isRegular() { return regular; }
    public void setRegular(boolean regular) { this.regular = regular; }
    public Integer getDefaultBattingOrder() { return defaultBattingOrder; }
    public void setDefaultBattingOrder(Integer defaultBattingOrder) { this.defaultBattingOrder = defaultBattingOrder; }
    public String getWhatsappName() { return whatsappName; }
    public void setWhatsappName(String whatsappName) { this.whatsappName = whatsappName; }
    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }

    public PositionSlot getPrimaryPosition() { return primaryPosition; }
    public void setPrimaryPosition(PositionSlot primaryPosition) { this.primaryPosition = primaryPosition; }
    public PositionSlot getSecondaryPosition() { return secondaryPosition; }
    public void setSecondaryPosition(PositionSlot secondaryPosition) { this.secondaryPosition = secondaryPosition; }
    public PositionSlot getTertiaryPosition() { return tertiaryPosition; }
    public void setTertiaryPosition(PositionSlot tertiaryPosition) { this.tertiaryPosition = tertiaryPosition; }
}
