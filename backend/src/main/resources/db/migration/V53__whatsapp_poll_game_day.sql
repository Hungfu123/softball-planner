-- Poll-Modus dreiwertig: TRAINING (an Trainingstag gekoppelt), ONE_OFF (einmalig),
-- GAME_DAY (einmalig, an einen Spieltag gekoppelt, bucht Anwesenheit auf Wunsch).
ALTER TABLE whatsapp_polls ADD COLUMN mode VARCHAR(12);
UPDATE whatsapp_polls SET mode = CASE WHEN training_coupled THEN 'TRAINING' ELSE 'ONE_OFF' END;
ALTER TABLE whatsapp_polls ALTER COLUMN mode SET NOT NULL;
ALTER TABLE whatsapp_polls DROP COLUMN training_coupled;

ALTER TABLE whatsapp_polls ADD COLUMN game_day_id BIGINT
    REFERENCES game_days(id) ON DELETE CASCADE;
-- Max. eine Umfrage pro Spieltag: bei zwei Polls waere unklar, dessen
-- last_sent_message_id der Stimmen-Abruf verwenden soll.
CREATE UNIQUE INDEX uq_poll_game_day ON whatsapp_polls (game_day_id)
    WHERE game_day_id IS NOT NULL;

-- Stimmen koennen jetzt auf ein Training ODER einen Spieltag zeigen.
ALTER TABLE whatsapp_synced_vote ALTER COLUMN training_id DROP NOT NULL;
ALTER TABLE whatsapp_synced_vote ADD COLUMN game_day_id BIGINT
    REFERENCES game_days(id) ON DELETE CASCADE;
ALTER TABLE whatsapp_synced_vote ADD CONSTRAINT chk_vote_target
    CHECK ((training_id IS NULL) <> (game_day_id IS NULL));
CREATE UNIQUE INDEX uq_synced_vote_gameday ON whatsapp_synced_vote (game_day_id, voter_name);
