-- Drei Situationen, die im Katalog fehlten: Ball in die Mitte mit Runner auf 2, und die
-- beiden Faelle mit zwei Runnern. Fuer einen Outfielder ist genau das die erste Frage,
-- die er im Spiel beantworten muss: wohin geht der Wurf.
--
-- Dieselbe Teamkonvention wie im ganzen Katalog: Cut-Mann ist ein Mittelinfielder (links
-- und Mitte der SS, rechts der 2B), der andere covert die 2, der Mann an der Zielbase
-- stellt ihn, die Corner bleiben an ihren Bases, und die Absicherung laeuft als Regel mit.
--
-- Erzeugt aus scripts/build-seed-plays.mjs; dort stehen die Plays als Quelle.

-- Single ins CF, Runner auf 2 — Wurf nach Home (neues Play)
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Single ins CF, Runner auf 2 — Wurf nach Home', id, 'ANY', NULL
FROM play_category WHERE name = 'Cut-off & Relay'
  AND NOT EXISTS (SELECT 1 FROM play WHERE title = 'Single ins CF, Runner auf 2 — Wurf nach Home');

-- Single ins CF, Runner auf 2 — Wurf nach Home – Stand 1 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner auf 2, Ball in die Mitte. Fuer den CF der haeufigste Wurf ueberhaupt.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins CF, Runner auf 2 — Wurf nach Home'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 1);

-- Single ins CF, Runner auf 2 — Wurf nach Home – Stand 2 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 3000, 'CF laeuft an und nimmt auf.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":98},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":121.06,"y":167.09,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":105,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Single ins CF, Runner auf 2 — Wurf nach Home'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 2);

-- Single ins CF, Runner auf 2 — Wurf nach Home – Stand 3 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 3000, 'Ball in der Mitte, also stellt der C den SS. Der 3B bleibt an der 3, der 2B covert die 2, der P geht hinter die Platte.', 1, '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":155,"y":148.4},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":98},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":133.79,"y":196.79,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":141.4,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins CF, Runner auf 2 — Wurf nach Home'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 3);

-- Single ins CF, Runner auf 2 — Wurf nach Home – Stand 4 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1200, 'Durchlassen, Wurf nach Home.', 1, '{"defenders":[{"position":"P","x":155,"y":238},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":155,"y":148.4},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":98},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":150.76,"y":213.76,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":228,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins CF, Runner auf 2 — Wurf nach Home'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 4);

-- Single ins RF, Runner auf 1 und 3 — Wurf auf die 3 (neues Play)
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Single ins RF, Runner auf 1 und 3 — Wurf auf die 3', id, 'ANY', 'Der Run von der 3 faellt. Zu holen ist der Runner, der von der 1 kommt.'
FROM play_category WHERE name = 'Cut-off & Relay'
  AND NOT EXISTS (SELECT 1 FROM play WHERE title = 'Single ins RF, Runner auf 1 und 3 — Wurf auf die 3');

-- Single ins RF, Runner auf 1 und 3 — Wurf auf die 3 – Stand 1 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner auf 1 und 3. Der Ball geht nach rechts, der Run von der 3 ist weg.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins RF, Runner auf 1 und 3 — Wurf auf die 3'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 1);

-- Single ins RF, Runner auf 1 und 3 — Wurf auf die 3 – Stand 2 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2800, 'RF nimmt auf, der Runner von der 1 rundet die 2.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"r1","x":163.49,"y":141.63,"status":"ACTIVE"},{"id":"r3","x":138.03,"y":201.03,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":210.37,"y":119.33,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Single ins RF, Runner auf 1 und 3 — Wurf auf die 3'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 2);

-- Single ins RF, Runner auf 1 und 3 — Wurf auf die 3 – Stand 3 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 2600, 'Ball rechts, also zieht der 2B als Cut heraus. Der 3B stellt ihn, der SS covert die 2, der P geht hinter die 3.', 1, '{"defenders":[{"position":"P","x":102.57,"y":165.57},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":168.91,"y":141.75},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"r1","x":133.79,"y":154.36,"status":"ACTIVE"},{"id":"r3","x":138.03,"y":201.03,"status":"SCORED"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":175.07,"y":138.42,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins RF, Runner auf 1 und 3 — Wurf auf die 3'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 3);

-- Single ins RF, Runner auf 1 und 3 — Wurf auf die 3 – Stand 4 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 3000, 'Wurf auf die 3, der Runner ist zu weit raus.', 2, '{"defenders":[{"position":"P","x":102.57,"y":165.57},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":168.91,"y":141.75},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":95.38,"y":185.79},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"r1","x":133.79,"y":154.36,"status":"OUT"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins RF, Runner auf 1 und 3 — Wurf auf die 3'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 4);

-- Single ins LF, Runner auf 1 und 2 — Wurf auf die 3 (neues Play)
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Single ins LF, Runner auf 1 und 2 — Wurf auf die 3', id, 'ANY', 'Der von der 2 kommt nach Home durch. Der von der 1 ist der, den man kriegt.'
FROM play_category WHERE name = 'Cut-off & Relay'
  AND NOT EXISTS (SELECT 1 FROM play WHERE title = 'Single ins LF, Runner auf 1 und 2 — Wurf auf die 3');

-- Single ins LF, Runner auf 1 und 2 — Wurf auf die 3 – Stand 1 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner auf 1 und 2, Ball ins linke Feld.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins LF, Runner auf 1 und 2 — Wurf auf die 3'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 1);

-- Single ins LF, Runner auf 1 und 2 — Wurf auf die 3 – Stand 2 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 3000, 'LF nimmt auf. Vorne laeuft einer nach Home, hinten einer auf die 3.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":159.24,"y":137.39,"status":"ACTIVE"},{"id":"r2","x":129.54,"y":192.54,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":99.63,"y":119.33,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Single ins LF, Runner auf 1 und 2 — Wurf auf die 3'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 2);

-- Single ins LF, Runner auf 1 und 2 — Wurf auf die 3 – Stand 3 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 2600, 'Der SS zieht als Cut heraus, der 3B stellt ihn und bleibt an der 3. Der 2B covert die 2, der P geht hinter die 3.', 0, '{"defenders":[{"position":"P","x":102.57,"y":165.57},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":102.91,"y":141.75},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":131.67,"y":156.48,"status":"ACTIVE"},{"id":"r2","x":129.54,"y":192.54,"status":"SCORED"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":101.9,"y":134.82,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins LF, Runner auf 1 und 2 — Wurf auf die 3'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 3);

-- Single ins LF, Runner auf 1 und 2 — Wurf auf die 3 – Stand 4 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1600, 'Wurf auf die 3. Der Run zaehlt, den zweiten Runner hat man.', 1, '{"defenders":[{"position":"P","x":117.64,"y":194.92},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":102.91,"y":141.75},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":131.67,"y":156.48,"status":"OUT"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins LF, Runner auf 1 und 2 — Wurf auf die 3'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 4);
