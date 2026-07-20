ALTER TABLE whatsapp_polls
  ADD COLUMN last_sent_training_id BIGINT REFERENCES trainings(id) ON DELETE SET NULL;
