ALTER TABLE training_periods ADD COLUMN cycle_weeks INT NOT NULL DEFAULT 1;
ALTER TABLE training_periods ADD COLUMN active_weeks_in_cycle VARCHAR(255) NOT NULL DEFAULT '1';
