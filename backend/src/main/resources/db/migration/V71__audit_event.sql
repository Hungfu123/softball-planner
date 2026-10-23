-- Historie: wer hat wann was geaendert (nur Superadmin sieht sie). Alles wird geschrieben,
-- Scoring-Zeilen werden erst beim Lesen zu Spannen zusammengefasst.
-- username ist ein Schnappschuss: die Zeile bleibt lesbar, wenn der Account spaeter weg ist.
CREATE TABLE audit_event (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      REFERENCES app_user (id) ON DELETE SET NULL,
    username    TEXT        NOT NULL,
    kind        TEXT        NOT NULL,
    method      TEXT,
    path        TEXT,
    label       TEXT,
    target_type TEXT,
    target_id   BIGINT,
    status      INTEGER,
    occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_audit_event_occurred_at ON audit_event (occurred_at DESC);
CREATE INDEX idx_audit_event_user_occurred_at ON audit_event (user_id, occurred_at DESC);
