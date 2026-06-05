CREATE TABLE invitations (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    letter_date DATE,
    event_date DATE,
    venue VARCHAR(200),
    pairing_mode VARCHAR(10) NOT NULL DEFAULT 'HEIM_GAST',
    body_text TEXT,
    guest_teams JSONB NOT NULL DEFAULT '[]',
    games JSONB NOT NULL DEFAULT '[]',
    contacts JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
