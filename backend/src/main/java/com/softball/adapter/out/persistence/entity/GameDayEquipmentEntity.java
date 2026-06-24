package com.softball.adapter.out.persistence.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "game_day_equipment", uniqueConstraints = {
    @UniqueConstraint(name = "uq_game_day_equipment", columnNames = {"game_day_id", "equipment_item_id"})
})
public class GameDayEquipmentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_day_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private GameDayEntity gameDay;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "equipment_item_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private EquipmentItemEntity item;

    public GameDayEquipmentEntity() {}

    public GameDayEquipmentEntity(final GameDayEntity gameDay, final EquipmentItemEntity item) {
        this.gameDay = gameDay;
        this.item = item;
    }

    public Long getId() { return id; }
    public void setId(final Long id) { this.id = id; }
    public GameDayEntity getGameDay() { return gameDay; }
    public void setGameDay(final GameDayEntity gameDay) { this.gameDay = gameDay; }
    public EquipmentItemEntity getItem() { return item; }
    public void setItem(final EquipmentItemEntity item) { this.item = item; }
}
