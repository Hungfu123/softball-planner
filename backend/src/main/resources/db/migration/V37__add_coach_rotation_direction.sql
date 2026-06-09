-- Coach-Rotation Richtungs-Toggle: Primary/Backup pro Coach-Seite umdrehbar.
-- Default false = bisheriges Verhalten (Primary = höherer Lineup-Slot).
ALTER TABLE games ADD COLUMN first_base_coach_rotation_reversed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE games ADD COLUMN third_base_coach_rotation_reversed BOOLEAN NOT NULL DEFAULT false;
