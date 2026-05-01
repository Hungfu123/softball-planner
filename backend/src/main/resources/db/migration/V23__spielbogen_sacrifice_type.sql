ALTER TABLE spielbogen_at_bat ADD COLUMN sacrifice_type VARCHAR(8);
ALTER TABLE spielbogen_at_bat ADD CONSTRAINT spielbogen_atbat_sacrifice_check
    CHECK (sacrifice_type IS NULL OR sacrifice_type IN ('BUNT','FLY'));
