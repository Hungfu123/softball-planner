package com.softball.domain.model;

public class Player {
    private Long id;
    private String name;
    private boolean regular;

    public Player() {}

    public Player(final String name) {
        this.name = name;
    }

    public Player(final Long id, final String name, final boolean regular) {
        this.id = id;
        this.name = name;
        this.regular = regular;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public boolean isRegular() { return regular; }
    public void setRegular(final boolean regular) { this.regular = regular; }
}
