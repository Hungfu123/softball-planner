-- available_positions wird nicht mehr benutzt (Focus-Auswahl reicht)
ALTER TABLE training_plans ALTER COLUMN available_positions DROP NOT NULL;
ALTER TABLE training_plans ALTER COLUMN available_positions SET DEFAULT '';
