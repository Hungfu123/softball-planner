-- Ein Play ist eine Folge von Staenden. Jeder Stand ist ein vollstaendiger
-- Schnappschuss des Feldes; die sichtbare Linie zwischen zwei Staenden wird daraus
-- abgeleitet und nicht gespeichert.
--
-- Die Marker eines Stands liegen als JSON: neun Verteidiger, bis zu vier Runner und
-- ein Ball werden immer zusammen gelesen und zusammen geschrieben. Einzelne Marker
-- fragt niemand ab, eine eigene Tabelle waere Beziehungsgeflecht ohne Nutzen.
CREATE TABLE play (
    id                  BIGSERIAL PRIMARY KEY,
    title               VARCHAR(160) NOT NULL,
    category_id         BIGINT       NOT NULL REFERENCES play_category (id) ON DELETE RESTRICT,
    -- ANY, CLOSE_LATE, AHEAD, BEHIND. Etikett, fuer welchen Spielstand das Play gilt —
    -- dieselbe Situation hat bei 8:2 und bei 3:3 im letzten Inning zwei richtige Antworten.
    game_state          VARCHAR(16)  NOT NULL DEFAULT 'ANY',
    game_state_note     VARCHAR(300),
    -- Dasselbe Spielbild in anderer Lage. Einseitig: wer verknuepft, verknuepft von hier aus.
    counterpart_play_id BIGINT       REFERENCES play (id) ON DELETE SET NULL,
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX play_category_idx ON play (category_id);

CREATE TABLE play_step (
    id          BIGSERIAL PRIMARY KEY,
    play_id     BIGINT   NOT NULL REFERENCES play (id) ON DELETE CASCADE,
    -- Lueckenlos 1..N. Das PUT ersetzt immer alle Staende, deshalb reicht der Index.
    ordinal     INT      NOT NULL,
    duration_ms INT      NOT NULL,
    note        VARCHAR(300),
    -- Bis 3, damit ein Play mit dem dritten Out enden darf.
    outs        SMALLINT NOT NULL CHECK (outs BETWEEN 0 AND 3),
    markers     JSONB    NOT NULL
);

CREATE UNIQUE INDEX play_step_order_unique ON play_step (play_id, ordinal);
