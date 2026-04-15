CREATE TABLE training_plans (
    id BIGSERIAL PRIMARY KEY,
    training_id BIGINT NOT NULL UNIQUE REFERENCES trainings(id) ON DELETE CASCADE,
    player_count INTEGER NOT NULL,
    focus VARCHAR(50) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    available_positions TEXT NOT NULL,
    plan_content JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
