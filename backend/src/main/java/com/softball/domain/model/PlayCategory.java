package com.softball.domain.model;

/**
 * Eine Kategorie, nach der die Uebersicht gruppiert.
 *
 * Vom Trainer anlegbar. Der Name ist ohne Ruecksicht auf Gross- und Kleinschreibung
 * eindeutig, damit nicht "Cutoff" neben "cut off" steht und die Gruppierung zerfaellt.
 */
public class PlayCategory {

    private Long id;
    private String name;
    private int sortOrder;

    public PlayCategory() {}

    public PlayCategory(final Long id, final String name, final int sortOrder) {
        this.id = id;
        this.name = name;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(final int sortOrder) { this.sortOrder = sortOrder; }
}
