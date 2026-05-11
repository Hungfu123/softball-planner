ALTER TABLE substitutions ADD COLUMN created_at TIMESTAMP;
UPDATE substitutions SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE substitutions ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE substitutions ALTER COLUMN created_at SET DEFAULT NOW();
