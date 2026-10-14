-- Erstbefüllung des Positions-Profils aus den tatsächlich gespielten Lineups:
-- meistgespielte Position wird Primär, zweithäufigste Sekundär, dritthäufigste Tertiär.
--
-- EH fließt nicht ein (kein Feldposten), ebensowenig Einträge ohne Position
-- (nur Batting). Gruppen (IF/OF/IF_OF) rät der Backfill NICHT — die Lineups kennen
-- nur echte Positionen; Sammelwerte setzt das Team beim Überarbeiten von Hand.
--
-- Gleichstand wird nach fester Positions-Reihenfolge aufgelöst (P, C, 1B, 2B, 3B,
-- SS, LF, CF, RF), damit zwei Läufe dasselbe Ergebnis liefern.
--
-- Nur Spieler mit komplett leerem Profil werden angefasst — ein später von Hand
-- gepflegtes Profil überschreibt diese Migration nie.
WITH counts AS (
    SELECT le.player_id,
           le.position AS pos,
           COUNT(*)    AS games
    FROM lineup_entries le
    WHERE le.position IS NOT NULL
      AND le.position <> 'EH'
    GROUP BY le.player_id, le.position
), ranked AS (
    SELECT player_id,
           pos,
           ROW_NUMBER() OVER (
               PARTITION BY player_id
               ORDER BY games DESC,
                        CASE pos
                            WHEN 'P' THEN 1
                            WHEN 'C' THEN 2
                            WHEN 'FIRST_BASE' THEN 3
                            WHEN 'SECOND_BASE' THEN 4
                            WHEN 'THIRD_BASE' THEN 5
                            WHEN 'SS' THEN 6
                            WHEN 'LF' THEN 7
                            WHEN 'CF' THEN 8
                            WHEN 'RF' THEN 9
                            ELSE 10
                        END
           ) AS rn
    FROM counts
), profile AS (
    SELECT player_id,
           MAX(CASE WHEN rn = 1 THEN pos END) AS p1,
           MAX(CASE WHEN rn = 2 THEN pos END) AS p2,
           MAX(CASE WHEN rn = 3 THEN pos END) AS p3
    FROM ranked
    WHERE rn <= 3
    GROUP BY player_id
)
UPDATE players p
SET primary_position   = profile.p1,
    secondary_position = profile.p2,
    tertiary_position  = profile.p3
FROM profile
WHERE p.id = profile.player_id
  AND p.primary_position   IS NULL
  AND p.secondary_position IS NULL
  AND p.tertiary_position  IS NULL;
