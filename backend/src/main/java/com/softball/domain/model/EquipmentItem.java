package com.softball.domain.model;

public class EquipmentItem {
    private Long id;
    private String name;
    private int quantity;
    private String storageLocation;
    private String notes;

    public EquipmentItem() {}

    public EquipmentItem(final Long id, final String name,
                         final int quantity, final String storageLocation, final String notes) {
        this.id = id;
        this.name = name;
        this.quantity = quantity;
        this.storageLocation = storageLocation;
        this.notes = notes;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public int getQuantity() { return quantity; }
    public void setQuantity(final int quantity) { this.quantity = quantity; }
    public String getStorageLocation() { return storageLocation; }
    public void setStorageLocation(final String storageLocation) { this.storageLocation = storageLocation; }
    public String getNotes() { return notes; }
    public void setNotes(final String notes) { this.notes = notes; }
}
