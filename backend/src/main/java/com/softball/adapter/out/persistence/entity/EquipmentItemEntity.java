package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

@Entity
@Table(name = "equipment_item")
public class EquipmentItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category = "Sonstiges";

    @Column(nullable = false)
    private int quantity = 1;

    @Column(name = "storage_location")
    private String storageLocation;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public EquipmentItemEntity() {}

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(final String category) { this.category = category; }
    public int getQuantity() { return quantity; }
    public void setQuantity(final int quantity) { this.quantity = quantity; }
    public String getStorageLocation() { return storageLocation; }
    public void setStorageLocation(final String storageLocation) { this.storageLocation = storageLocation; }
    public String getNotes() { return notes; }
    public void setNotes(final String notes) { this.notes = notes; }
}
