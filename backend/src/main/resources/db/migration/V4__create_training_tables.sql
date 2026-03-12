-- Training
CREATE TABLE trainings (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    time VARCHAR(255),
    location VARCHAR(255),
    cancelled BOOLEAN NOT NULL DEFAULT FALSE
);

-- Training Attendance
CREATE TABLE training_attendance (
    id BIGSERIAL PRIMARY KEY,
    training_id BIGINT NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES players(id),
    present BOOLEAN NOT NULL,
    UNIQUE (training_id, player_id)
);
