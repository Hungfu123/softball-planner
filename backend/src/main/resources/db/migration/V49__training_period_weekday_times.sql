ALTER TABLE training_periods ADD COLUMN weekday_times VARCHAR(255);

-- Backfill: bestehende generelle time fuer alle Wochentage der Periode uebernehmen.
UPDATE training_periods SET weekday_times = (
    SELECT string_agg(wd || '=' || time, ',' ORDER BY wd::int)
    FROM regexp_split_to_table(weekdays, ',') AS wd
)
WHERE weekdays IS NOT NULL AND weekdays <> '' AND time IS NOT NULL AND time <> '';
