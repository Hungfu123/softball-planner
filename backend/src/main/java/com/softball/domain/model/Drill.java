package com.softball.domain.model;

import java.util.List;

public class Drill {
    private String id;
    private String name;
    private List<DrillCategory> categories;
    private int minPlayers;
    private List<String> equipment;
    private String description;
    private boolean hasImage;
    private Integer pdfPage;
    private String rotation;
    private String variants;
    private DrillComplexity complexity = DrillComplexity.BASIC;

    public Drill() {}

    public Drill(final String id, final String name, final List<DrillCategory> categories,
                 final int minPlayers, final List<String> equipment, final String description,
                 final boolean hasImage, final Integer pdfPage, final String rotation, final String variants) {
        this.id = id;
        this.name = name;
        this.categories = categories;
        this.minPlayers = minPlayers;
        this.equipment = equipment;
        this.description = description;
        this.hasImage = hasImage;
        this.pdfPage = pdfPage;
        this.rotation = rotation;
        this.variants = variants;
    }

    public String getId() { return id; }
    public void setId(final String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(final String name) { this.name = name; }
    public List<DrillCategory> getCategories() { return categories; }
    public void setCategories(final List<DrillCategory> categories) { this.categories = categories; }
    public int getMinPlayers() { return minPlayers; }
    public void setMinPlayers(final int minPlayers) { this.minPlayers = minPlayers; }
    public List<String> getEquipment() { return equipment; }
    public void setEquipment(final List<String> equipment) { this.equipment = equipment; }
    public String getDescription() { return description; }
    public void setDescription(final String description) { this.description = description; }
    public boolean isHasImage() { return hasImage; }
    public void setHasImage(final boolean hasImage) { this.hasImage = hasImage; }
    public Integer getPdfPage() { return pdfPage; }
    public void setPdfPage(final Integer pdfPage) { this.pdfPage = pdfPage; }
    public String getRotation() { return rotation; }
    public void setRotation(final String rotation) { this.rotation = rotation; }
    public String getVariants() { return variants; }
    public void setVariants(final String variants) { this.variants = variants; }
    public DrillComplexity getComplexity() { return complexity; }
    public void setComplexity(final DrillComplexity complexity) {
        this.complexity = complexity;
    }
}
