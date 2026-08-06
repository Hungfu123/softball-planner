-- Öffentlicher Lese-Token für den Zuschauer-Link. NULL = kein Link vergeben.
ALTER TABLE spielbogen ADD COLUMN public_token VARCHAR(43);

CREATE UNIQUE INDEX uq_spielbogen_public_token ON spielbogen(public_token);
