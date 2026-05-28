-- T16: Multi-Plan pro Training (MAIN + BEGINNER)
-- Bisher: UNIQUE(training_id) → ein Plan pro Training.
-- Neu: kind-Spalte unterscheidet MAIN/BEGINNER → composite UNIQUE(training_id, kind).
-- Bestehende Pläne (inkl. solche mit Dual-Group-Sections aus T6-T15) migrieren auf kind=MAIN.

ALTER TABLE training_plans
    ADD COLUMN kind VARCHAR(20) NOT NULL DEFAULT 'MAIN';

-- Alte Single-Column-UNIQUE löschen (Postgres-Auto-Name für inline UNIQUE).
ALTER TABLE training_plans
    DROP CONSTRAINT training_plans_training_id_key;

-- Composite UNIQUE(training_id, kind) → max 2 Pläne pro Training (MAIN + BEGINNER).
ALTER TABLE training_plans
    ADD CONSTRAINT training_plans_training_id_kind_key UNIQUE (training_id, kind);
