ALTER TABLE substitutions ADD COLUMN created_at TIMESTAMP(6) WITH TIME ZONE;
UPDATE substitutions SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE substitutions ALTER COLUMN created_at SET NOT NULL;
