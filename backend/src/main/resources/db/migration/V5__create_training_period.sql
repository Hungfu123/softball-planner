CREATE TABLE training_periods (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL
);

ALTER TABLE trainings ADD COLUMN period_id BIGINT REFERENCES training_periods(id);
