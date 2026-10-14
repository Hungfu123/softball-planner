-- Positions-Profil je Spieler: Primär / Sekundär / Tertiär.
-- Werte sind PositionSlot-Namen (P, C, FIRST_BASE … RF) plus die Gruppen IF, OF, IF_OF.
-- Bewusst drei Spalten statt eigener Tabelle: feste Anzahl, feste Reihenfolge, keine Historie.
ALTER TABLE players ADD COLUMN primary_position   VARCHAR(255);
ALTER TABLE players ADD COLUMN secondary_position VARCHAR(255);
ALTER TABLE players ADD COLUMN tertiary_position  VARCHAR(255);
