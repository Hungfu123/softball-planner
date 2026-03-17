package com.softball.adapter.out.persistence.entity;

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
}
