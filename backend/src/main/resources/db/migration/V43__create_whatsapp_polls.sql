CREATE TABLE whatsapp_polls (
    id BIGSERIAL PRIMARY KEY,
    group_id VARCHAR(120) NOT NULL,
    group_name VARCHAR(200),
    title VARCHAR(200) NOT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    weekday VARCHAR(10) NOT NULL,
    send_time TIME NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    skip_dates JSONB NOT NULL DEFAULT '[]',
    last_sent_at TIMESTAMP
);
