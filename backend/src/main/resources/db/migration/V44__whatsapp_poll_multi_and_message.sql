ALTER TABLE whatsapp_polls ADD COLUMN allow_multiple_answers BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE whatsapp_polls ADD COLUMN message TEXT;
