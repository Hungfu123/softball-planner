-- Kategorien fuer den Playmaker.
--
-- Eigene Tabelle statt Enum, weil der Trainer eigene Kategorien anlegen koennen soll.
-- Der eindeutige Index liegt auf lower(name): sonst stehen nach einem Jahr "Cutoff",
-- "cutoff" und "CUTOFF" nebeneinander und die Gruppierung der Uebersicht zerfaellt.
CREATE TABLE play_category (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(80) NOT NULL,
    sort_order INT         NOT NULL
);

CREATE UNIQUE INDEX play_category_name_unique ON play_category (lower(name));

-- Startsatz. Entspricht dem Katalog aus docs/superpowers/specs/2026-10-20-playmaker-design.md.
INSERT INTO play_category (name, sort_order) VALUES
    ('Cut-off & Relay',          10),
    ('Bunt-Defense',             20),
    ('Rundown',                  30),
    ('First-and-Third',          40),
    ('Pop-up-Priorities',        50),
    ('Steal-Defense & Pickoff',  60),
    ('Base-Coverage',            70),
    ('Spielsituationen',         80);
