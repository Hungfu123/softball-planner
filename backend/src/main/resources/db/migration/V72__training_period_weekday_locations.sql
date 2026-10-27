-- Ort je Wochentag, wie es die Uhrzeit seit V49 schon ist.
--
-- Bis hierher trug eine Periode EINEN Ort fuer alle ihre Wochentage. Das stimmt im Sommer,
-- wo alles auf demselben Platz stattfindet, und stimmt im Winter nicht: dort liegt der
-- Montag in der einen Halle und der Donnerstag in der anderen.
--
-- JSON statt CSV wie bei weekday_times: ein Ortsname ist freier Text und darf ein Komma
-- enthalten ("Halle Nord, Bottrop"). Bei "19:00" konnte das nie passieren.
--
-- Kein Backfill: `location` bleibt der Rueckfall fuer jeden Wochentag ohne eigenen Eintrag.
-- Die Migration legt keine Daten an, die niemand eingegeben hat.
ALTER TABLE training_periods
    ADD COLUMN weekday_locations jsonb NOT NULL DEFAULT '{}'::jsonb;
