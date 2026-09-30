package com.softball.domain.model;

public class Player {
    private Long id;
    private String name;
    private boolean regular;
    private Integer defaultBattingOrder;
    private String whatsappName;
    private boolean archived;

    public Player() {}

    public Player(final String name) {
        this.name = name;
    }

    public Player(final Long id, final String name, final boolean regular) {
        this.id = id;
        this.name = name;
        this.regular = regular;
    }

    public Player(final Long id, final String name, final boolean regular, final Integer defaultBattingOrder) {
        this.id = id;
        this.name = name;
        this.regular = regular;
        this.defaultBattingOrder = defaultBattingOrder;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public boolean isRegular() { return regular; }
    public void setRegular(final boolean regular) { this.regular = regular; }
    public Integer getDefaultBattingOrder() { return defaultBattingOrder; }
    public void setDefaultBattingOrder(final Integer defaultBattingOrder) { this.defaultBattingOrder = defaultBattingOrder; }
    public String getWhatsappName() { return whatsappName; }
    public void setWhatsappName(final String whatsappName) { this.whatsappName = whatsappName; }
    public boolean isArchived() { return archived; }
    public void setArchived(final boolean archived) { this.archived = archived; }
}
