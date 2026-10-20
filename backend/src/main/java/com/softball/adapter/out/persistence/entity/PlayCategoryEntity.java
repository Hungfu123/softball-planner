package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "play_category")
public class PlayCategoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 80)
    private String name;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(final int sortOrder) { this.sortOrder = sortOrder; }
}
