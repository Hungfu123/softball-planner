-- Eine eigene Kategorie fuer das Outfield, und Cut-off & Relay eine Stufe hoeher.
--
-- Vorgabe des Trainers: **zwei Bases weiter werfen, ausser es steht einer auf der 3.**
-- Das ist der Anfang fuer einen Outfielder, und er stand bisher in keiner Kategorie, die
-- nach ihm heisst — die Antworten lagen verteilt in Base-Coverage, Cut-off & Relay und
-- Pop-up-Priorities. Cut-off und Relay sind dagegen NICHT Basis: wer wen stellt, wird
-- noch geuebt, also wandert die Kategorie von Stufe 3 auf Stufe 2 (die Stufe kommt aus
-- `sort_order`, siehe `kategorieStufe`).
--
-- Dazu drei inhaltliche Aenderungen:
--
-- * **Die Aufnahmepunkte liegen weiter draussen**, 155 statt 120 Fuss. 120 ist 35 Fuss
--   hinter der zweiten Base: auf dem Bild stand der CF mitten im Infield, obwohl die
--   Outfielder bei 185 Fuss starten.
-- * **„Wohin der Wurf geht"** ist die Regel selbst als Play: drei Faelle, dann die
--   Ausnahme. Es steht als erstes im Kapitel.
-- * **„Fly in die linke Gasse — wer ruft"**: der haeufigste Zusammenstoss passiert nicht
--   am Infield-Rand, sondern in der Gasse. Dreimal rufen, weil das erste Mal keiner hoert.

INSERT INTO play_category (name, sort_order)
SELECT 'Outfield', 15
WHERE NOT EXISTS (SELECT 1 FROM play_category WHERE name = 'Outfield');

UPDATE play_category SET sort_order = 45 WHERE name = 'Cut-off & Relay';

-- Die Basics ziehen um. Was in Cut-off & Relay bleibt, ist die echte Kette:
-- Doubles in die Gassen, Doppel-Relay, Ball am Zaun.
UPDATE play SET category_id = (SELECT id FROM play_category WHERE name = 'Outfield')
WHERE title IN (
  'Single ins LF, Runner auf 1 — Wurf auf die 3',
  'Single ins CF, Runner auf 1 — Wurf auf die 3',
  'Single ins RF, Runner auf 1 — Wurf auf die 3',
  'Single ins LF, Runner auf 2 — Wurf nach Home',
  'Single ins RF, Runner auf 2 — Wurf nach Home',
  'Single ins CF, Runner auf 2 — Wurf nach Home',
  'Single ins RF, Runner auf 1 und 3 — Wurf auf die 3',
  'Single ins LF, Runner auf 1 und 2 — Wurf auf die 3',
  'Single ins LF — Backup hinter der 2',
  'Single ins RF — Backup hinter der 1'
);

-- Single ins CF — wer covert die 2 – Stand 2
UPDATE play_step SET
    duration_ms = 2400,
    note = 'CF läuft an, SS geht als Cut heraus, der 2B covert die 2.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":155,"y":94.57},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":63},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":167.73,"y":145.88,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":70,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Single ins CF — wer covert die 2');

-- Single ins CF — wer covert die 2 – Stand 3
UPDATE play_step SET
    duration_ms = 2400,
    note = 'Wurf zum Cut — von dort geht es überall hin.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":155,"y":94.57},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":63},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"rb","x":193.18,"y":179.82,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":94.57,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins CF — wer covert die 2');

-- Single ins CF — wer covert die 2 – Stand 4
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Der Runner bleibt stehen, also zurück in den Infield.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":155,"y":94.57},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":63},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Single ins CF — wer covert die 2');

-- Single ins CF — Batter will die 2 (neues Play)
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Single ins CF — Batter will die 2', id, 'ANY', NULL
FROM play_category WHERE name = 'Outfield'
  AND NOT EXISTS (SELECT 1 FROM play WHERE title = 'Single ins CF — Batter will die 2');

-- Single ins CF — Batter will die 2 – Stand 1 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Keine Runner. Ball fällt in die Mitte, der Batter rundet die 1 weit.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins CF — Batter will die 2'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 1);

-- Single ins CF — Batter will die 2 – Stand 2 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2400, 'CF läuft an. Ball in der Mitte, also SS als Cut und der 2B an die Base.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":155,"y":94.57},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":63},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":70,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Single ins CF — Batter will die 2'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 2);

-- Single ins CF — Batter will die 2 – Stand 3 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 3000, 'Wurf auf die 2, der Cut lässt durch.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":155,"y":94.57},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":63},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":174.09,"y":152.24,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":105.09,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins CF — Batter will die 2'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 3);

-- Single ins CF — Batter will die 2 – Stand 4 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1200, 'Der 2B taggt. Kein Force, er muss berührt werden.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":155,"y":94.57},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":63},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":174.09,"y":152.24,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":123.15,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins CF — Batter will die 2'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 4);

-- Single ins RF — Batter will die 2 (neues Play)
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Single ins RF — Batter will die 2', id, 'ANY', NULL
FROM play_category WHERE name = 'Outfield'
  AND NOT EXISTS (SELECT 1 FROM play WHERE title = 'Single ins RF — Batter will die 2');

-- Single ins RF — Batter will die 2 – Stand 1 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Dasselbe von rechts, und damit dreht sich das Paar.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins RF — Batter will die 2'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 1);

-- Single ins RF — Batter will die 2 – Stand 2 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2000, 'RF nimmt auf. Ball rechts, also 2B als Cut und der SS an die Base.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":197.63,"y":105.99},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":232.5,"y":83.77}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":228.16,"y":89.27,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Single ins RF — Batter will die 2'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 2);

-- Single ins RF — Batter will die 2 – Stand 3 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 3000, 'Wurf auf die 2, der Cut lässt durch.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":197.63,"y":105.99},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":232.5,"y":83.77}],"runners":[{"id":"rb","x":171.97,"y":150.12,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":186,"y":113.4,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins RF — Batter will die 2'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 3);

-- Single ins RF — Batter will die 2 – Stand 4 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 2000, 'Der SS taggt. Wer an der Base steht, hängt daran, wohin der Ball ging.', 1, '{"defenders":[{"position":"P","x":138.13,"y":143.89},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":197.63,"y":105.99},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":232.5,"y":83.77}],"runners":[{"id":"rb","x":171.97,"y":150.12,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":123.15,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins RF — Batter will die 2'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 4);

-- Single ins LF — Backup hinter der 2 – Stand 2
UPDATE play_step SET
    duration_ms = 2000,
    note = 'LF läuft an, CF sichert schräg dahinter ab.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":77.5,"y":83.77},{"position":"CF","x":121.54,"y":54.92},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":81.84,"y":89.27,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF — Backup hinter der 2');

-- Single ins LF — Backup hinter der 2 – Stand 3
UPDATE play_step SET
    duration_ms = 2800,
    note = 'Wurf auf die 2: SS nimmt an, der 2B steht dahinter. Der P sichert die 3 ab.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":96.57,"y":187.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":178,"y":141.15},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":77.5,"y":83.77},{"position":"CF","x":121.54,"y":54.92},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF — Backup hinter der 2');

-- Single ins RF — Backup hinter der 1 – Stand 2
UPDATE play_step SET
    duration_ms = 1200,
    note = 'RF nimmt auf, 1B kommt zurück zur Base.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":232.5,"y":83.77}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":228.16,"y":89.27,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF — Backup hinter der 1');

-- Single ins RF — Backup hinter der 1 – Stand 3
UPDATE play_step SET
    duration_ms = 2600,
    note = 'Wurf zurück zur 1, 2B sichert im Foul-Gebiet dahinter ab.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":192.43,"y":192.57},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":232.5,"y":83.77}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"1B","x":204.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF — Backup hinter der 1');

-- Wohin der Wurf geht (neues Play)
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Wohin der Wurf geht', id, 'ANY', NULL
FROM play_category WHERE name = 'Outfield'
  AND NOT EXISTS (SELECT 1 FROM play WHERE title = 'Wohin der Wurf geht');

-- Wohin der Wurf geht – Stand 1 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 2400, 'Keiner drauf: zwei Bases weiter heisst die 2. Dorthin, wo der Batter hinwill.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":155,"y":94.57},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":63},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":70,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Wohin der Wurf geht'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 1);

-- Wohin der Wurf geht – Stand 2 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1400, 'Runner auf 1: zwei Bases weiter heisst die 3.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":135.91,"y":113.66},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":63},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":171.97,"y":201.03,"status":"ACTIVE"},{"id":"r1","x":138.03,"y":150.12,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":63,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Wohin der Wurf geht'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 2);

-- Wohin der Wurf geht – Stand 3 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, 'Runner auf 2: zwei Bases weiter heisst Home.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":155,"y":128.1},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":63},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":171.97,"y":201.03,"status":"ACTIVE"},{"id":"r1","x":138.03,"y":150.12,"status":"ACTIVE"},{"id":"r2","x":133.79,"y":196.79,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":63,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Wohin der Wurf geht'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 3);

-- Wohin der Wurf geht – Stand 4 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1400, 'Steht einer auf der 3, gilt es nicht: dann zaehlt der Run, und der Wurf geht nach Home. Und immer kommt dir ein Infielder entgegen, wirf auf ihn.', 0, '{"defenders":[{"position":"P","x":155,"y":153.15},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":155,"y":128.1},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":63},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":176.21,"y":196.79,"status":"ACTIVE"},{"id":"r1","x":138.03,"y":150.12,"status":"ACTIVE"},{"id":"r2","x":133.79,"y":196.79,"status":"ACTIVE"},{"id":"r3","x":138.03,"y":201.03,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":121.1,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Wohin der Wurf geht'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 4);

-- Single ins LF, Runner auf 1 — Wurf auf die 3 – Stand 2
UPDATE play_step SET
    duration_ms = 1600,
    note = 'Ball fällt vor dem LF auf.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":77.5,"y":83.77},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":171.97,"y":150.12,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":81.84,"y":89.27,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF, Runner auf 1 — Wurf auf die 3');

-- Single ins LF, Runner auf 1 — Wurf auf die 3 – Stand 3
UPDATE play_step SET
    duration_ms = 2800,
    note = 'SS geht als Cut-Mann auf die Linie LF–3B, der 2B rückt auf die 2, der P hinter die 3.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":93.28,"y":125.08},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":77.5,"y":83.77},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":138.03,"y":150.12,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":91.15,"y":118.41,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF, Runner auf 1 — Wurf auf die 3');

-- Single ins LF, Runner auf 1 — Wurf auf die 3 – Stand 4
UPDATE play_step SET
    duration_ms = 1400,
    note = 'Cut lässt durch — der Wurf geht auf die 3.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":119.59,"y":194.3},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":93.28,"y":125.08},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":77.5,"y":83.77},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":116.82,"y":171.33,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF, Runner auf 1 — Wurf auf die 3');

-- Single ins CF, Runner auf 1 — Wurf auf die 3 – Stand 2
UPDATE play_step SET
    duration_ms = 1400,
    note = 'CF läuft an.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":63},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":174.09,"y":152.24,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":70,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Single ins CF, Runner auf 1 — Wurf auf die 3');

-- Single ins CF, Runner auf 1 — Wurf auf die 3 – Stand 3
UPDATE play_step SET
    duration_ms = 2800,
    note = 'SS stellt sich zwischen CF und 3B, der 2B covert die 2, der P sichert hinter der 3 ab.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":133.79,"y":119.29},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":63},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":133.79,"y":154.36,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":136.56,"y":112.86,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins CF, Runner auf 1 — Wurf auf die 3');

-- Single ins CF, Runner auf 1 — Wurf auf die 3 – Stand 4
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Wurf durch auf die 3.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":105.43,"y":194.25},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":133.79,"y":119.29},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":63},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":114.69,"y":173.45,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Single ins CF, Runner auf 1 — Wurf auf die 3');

-- Single ins RF, Runner auf 1 — Wurf auf die 3 – Stand 2
UPDATE play_step SET
    duration_ms = 1600,
    note = 'RF nimmt den Ball auf.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":232.5,"y":83.77}],"runners":[{"id":"r1","x":171.97,"y":150.12,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":228.16,"y":89.27,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 1 — Wurf auf die 3');

-- Single ins RF, Runner auf 1 — Wurf auf die 3 – Stand 3
UPDATE play_step SET
    duration_ms = 2800,
    note = 'Ball rechts, also zieht der 2B als Cut heraus. Der SS covert die 2, der 3B stellt ihn, der P sichert hinter der 3 ab.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":178.53,"y":125.08},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":232.5,"y":83.77}],"runners":[{"id":"r1","x":135.91,"y":152.24,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":184.21,"y":120.98,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 1 — Wurf auf die 3');

-- Single ins RF, Runner auf 1 — Wurf auf die 3 – Stand 4
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Der Runner war zu weit raus — Wurf auf die 3.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":178.53,"y":125.08},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":232.5,"y":83.77}],"runners":[{"id":"r1","x":135.91,"y":152.24,"status":"OUT"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 1 — Wurf auf die 3');

-- Single ins LF, Runner auf 2 — Wurf nach Home – Stand 2
UPDATE play_step SET
    duration_ms = 2200,
    note = 'Ball ins linke Feld, der Runner rundet die 3.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":77.5,"y":83.77},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":121.06,"y":167.09,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":81.84,"y":89.27,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF, Runner auf 2 — Wurf nach Home');

-- Single ins LF, Runner auf 2 — Wurf nach Home – Stand 3
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Der C stellt den SS auf die Linie LF–Home — Ball links, also er. Der 3B bleibt an der 3, der 2B covert die 2, der P geht hinter die Platte.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":108.5,"y":137.46},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":77.5,"y":83.77},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":133.79,"y":196.79,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":105.11,"y":131.33,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF, Runner auf 2 — Wurf nach Home');

-- Single ins LF, Runner auf 2 — Wurf nach Home – Stand 4
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Durchlassen, Wurf nach Home.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":164.98,"y":235.33},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":108.5,"y":137.46},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":77.5,"y":83.77},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":150.76,"y":213.76,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":228,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF, Runner auf 2 — Wurf nach Home');

-- Single ins RF, Runner auf 2 — Wurf nach Home – Stand 2
UPDATE play_step SET
    duration_ms = 2200,
    note = 'RF nimmt auf.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":232.5,"y":83.77}],"runners":[{"id":"r2","x":118.94,"y":169.21,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":228.16,"y":89.27,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 2 — Wurf nach Home');

-- Single ins RF, Runner auf 2 — Wurf nach Home – Stand 3
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Der C stellt den 2B auf die Linie RF–Home. Der 1B bleibt an der 1, der SS covert die 2, der P geht hinter die Platte.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":228},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":197.63,"y":144.17},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":232.5,"y":83.77}],"runners":[{"id":"r2","x":135.91,"y":198.91,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":201.03,"y":138.05,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 2 — Wurf nach Home');

-- Single ins RF, Runner auf 2 — Wurf nach Home – Stand 4
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Der Wurf segelt — der Relay nimmt ihn runter. Der Run zählt, der Batter bleibt auf der 1.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":228},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":197.63,"y":144.17},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":232.5,"y":83.77}],"runners":[{"id":"r2","x":135.91,"y":198.91,"status":"SCORED"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":197.63,"y":144.17,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 2 — Wurf nach Home');

-- Single ins CF, Runner auf 2 — Wurf nach Home – Stand 2
UPDATE play_step SET
    duration_ms = 2200,
    note = 'CF laeuft an und nimmt auf.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":63},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":121.06,"y":167.09,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":70,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Single ins CF, Runner auf 2 — Wurf nach Home');

-- Single ins CF, Runner auf 2 — Wurf nach Home – Stand 3
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Ball in der Mitte, also stellt der C den SS. Der 3B bleibt an der 3, der 2B covert die 2, der P geht hinter die Platte.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":155,"y":128.1},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":63},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":133.79,"y":196.79,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":121.1,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins CF, Runner auf 2 — Wurf nach Home');

-- Single ins CF, Runner auf 2 — Wurf nach Home – Stand 4
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Durchlassen, Wurf nach Home.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":238},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":155,"y":128.1},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":63},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":150.76,"y":213.76,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":228,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Single ins CF, Runner auf 2 — Wurf nach Home');

-- Single ins RF, Runner auf 1 und 3 — Wurf auf die 3 – Stand 2
UPDATE play_step SET
    duration_ms = 2000,
    note = 'RF nimmt auf, der Runner von der 1 rundet die 2.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":232.5,"y":83.77}],"runners":[{"id":"r1","x":163.49,"y":141.63,"status":"ACTIVE"},{"id":"r3","x":138.03,"y":201.03,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":228.16,"y":89.27,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 1 und 3 — Wurf auf die 3');

-- Single ins RF, Runner auf 1 und 3 — Wurf auf die 3 – Stand 3
UPDATE play_step SET
    duration_ms = 2600,
    note = 'Ball rechts, also zieht der 2B als Cut heraus. Der 3B stellt ihn, der SS covert die 2, der P geht hinter die 3.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":102.57,"y":165.57},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":178.53,"y":125.08},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":232.5,"y":83.77}],"runners":[{"id":"r1","x":133.79,"y":154.36,"status":"ACTIVE"},{"id":"r3","x":138.03,"y":201.03,"status":"SCORED"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":184.21,"y":120.98,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 1 und 3 — Wurf auf die 3');

-- Single ins RF, Runner auf 1 und 3 — Wurf auf die 3 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Wurf auf die 3, der Runner ist zu weit raus.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":102.57,"y":165.57},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":178.53,"y":125.08},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":96.67,"y":187.7},{"position":"CF","x":155,"y":33},{"position":"RF","x":232.5,"y":83.77}],"runners":[{"id":"r1","x":133.79,"y":154.36,"status":"OUT"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 1 und 3 — Wurf auf die 3');

-- Single ins LF, Runner auf 1 und 2 — Wurf auf die 3 – Stand 2
UPDATE play_step SET
    duration_ms = 3000,
    note = 'LF nimmt auf. Vorne laeuft einer nach Home, hinten einer auf die 3.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":77.5,"y":83.77},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":159.24,"y":137.39,"status":"ACTIVE"},{"id":"r2","x":129.54,"y":192.54,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":81.84,"y":89.27,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF, Runner auf 1 und 2 — Wurf auf die 3');

-- Single ins LF, Runner auf 1 und 2 — Wurf auf die 3 – Stand 3
UPDATE play_step SET
    duration_ms = 2600,
    note = 'Der SS zieht als Cut heraus, der 3B stellt ihn und bleibt an der 3. Der 2B covert die 2, der P geht hinter die 3.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":102.57,"y":165.57},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":93.28,"y":125.08},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":77.5,"y":83.77},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":131.67,"y":156.48,"status":"ACTIVE"},{"id":"r2","x":129.54,"y":192.54,"status":"SCORED"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":91.15,"y":118.41,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF, Runner auf 1 und 2 — Wurf auf die 3');

-- Single ins LF, Runner auf 1 und 2 — Wurf auf die 3 – Stand 4
UPDATE play_step SET
    duration_ms = 1600,
    note = 'Wurf auf die 3. Der Run zaehlt, den zweiten Runner hat man.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":119.59,"y":194.3},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":93.28,"y":125.08},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":77.5,"y":83.77},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":131.67,"y":156.48,"status":"OUT"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF, Runner auf 1 und 2 — Wurf auf die 3');

-- Fly in die linke Gasse — wer ruft (neues Play)
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Fly in die linke Gasse — wer ruft', id, 'ANY', NULL
FROM play_category WHERE name = 'Outfield'
  AND NOT EXISTS (SELECT 1 FROM play WHERE title = 'Fly in die linke Gasse — wer ruft');

-- Fly in die linke Gasse — wer ruft – Stand 1 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Hoher Ball in die Gasse zwischen LF und CF. Beide laufen an.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Fly in die linke Gasse — wer ruft'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 1);

-- Fly in die linke Gasse — wer ruft – Stand 2 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2400, 'Beide sind unterwegs und sehen nur den Ball, nicht einander.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":75.32,"y":50.38},{"position":"CF","x":107.32,"y":46.38},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":91.32,"y":26.380000000000003,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Fly in die linke Gasse — wer ruft'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 2);

-- Fly in die linke Gasse — wer ruft – Stand 3 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 2000, 'Der CF hat Vorfahrt und ruft: „Meiner, meiner, meiner." Dreimal, weil das erste Mal keiner hoert.', 0, '{"defenders":[{"position":"P","x":143,"y":143.15},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65.32,"y":58.38},{"position":"CF","x":95.32,"y":56.38},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":186.82,"y":186.18,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":95.32,"y":48.38,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Fly in die linke Gasse — wer ruft'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 3);

-- Fly in die linke Gasse — wer ruft – Stand 4 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 800, 'LF dreht ab und sichert dahinter. CF faengt, Out.', 1, '{"defenders":[{"position":"P","x":143,"y":143.15},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":57.32,"y":68.38},{"position":"CF","x":95.32,"y":56.38},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":186.82,"y":186.18,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"CF","x":95.32,"y":56.38,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Fly in die linke Gasse — wer ruft'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 4);
