-- Start-Plays fuer den Playmaker. Erzeugt von scripts/build-seed-plays.mjs.
--
-- Einmalig: wer ein Start-Play aendert, aendert seine eigene Zeile; wer es loescht, ist es
-- los. Diese Migration fuegt nur ein und aktualisiert nie.

-- 1. Grounder zum SS — wer deckt die 2
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Grounder zum SS — wer deckt die 2', id, 'ANY', NULL
FROM play_category WHERE name = 'Base-Coverage';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner auf 1, keine Outs. Grounder geht zum Shortstop.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Grounder zum SS — wer deckt die 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1400, 'SS fängt, 2B kommt zur Base — nicht SS, der hat den Ball.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":129,"y":144},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":176.21,"y":154.36,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":132.95,"y":149.78,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Grounder zum SS — wer deckt die 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 600, 'Wurf auf die 2, Force Out.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":129,"y":144},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":176.21,"y":154.36,"status":"OUT"},{"id":"rb","x":163.4,"y":209.6,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Grounder zum SS — wer deckt die 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 2200, '2B dreht und wirft weiter auf die 1 — Doppelspiel, wenn der Batter langsam ist.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":129,"y":144},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Grounder zum SS — wer deckt die 2';

-- 2. Grounder zum 2B — wer deckt die 2
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Grounder zum 2B — wer deckt die 2', id, 'ANY', NULL
FROM play_category WHERE name = 'Base-Coverage';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Grounder nach rechts. Der 2B hat den Ball, also deckt der SS ab.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Grounder zum 2B — wer deckt die 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1400, 'SS zur Base, 2B fängt.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":181,"y":144},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":176.21,"y":154.36,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":177.05,"y":149.78,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Grounder zum 2B — wer deckt die 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 600, 'Kurzer Wurf auf die 2.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":181,"y":144},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":176.21,"y":154.36,"status":"OUT"},{"id":"rb","x":163.4,"y":209.6,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Grounder zum 2B — wer deckt die 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 2200, 'Weiter auf die 1.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":181,"y":144},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Grounder zum 2B — wer deckt die 2';

-- 3. Grounder zum 3B — Wurf auf die 1
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Grounder zum 3B — Wurf auf die 1', id, 'ANY', NULL
FROM play_category WHERE name = 'Base-Coverage';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Harter Grounder die Linie entlang.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Grounder zum 3B — Wurf auf die 1';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, '3B greift ihn an der Linie ab.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":111,"y":172},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":117.83,"y":173.55,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Grounder zum 3B — Wurf auf die 1';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1600, 'Langer Wurf quer rüber, 1B an der Base — der C geht hinter die 1.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":172.82,"y":200.18},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":111,"y":172},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Grounder zum 3B — Wurf auf die 1';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1600, 'Out an der 1.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":172.82,"y":200.18},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":111,"y":172},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Grounder zum 3B — Wurf auf die 1';

-- 4. Grounder zum 1B — wer deckt die 1
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Grounder zum 1B — wer deckt die 1', id, 'ANY', NULL
FROM play_category WHERE name = 'Base-Coverage';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Grounder zum ersten Baseman. Er verlässt die Base — also muss jemand hin.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Grounder zum 1B — wer deckt die 1';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1600, '1B holt ihn weit vor der Base — jetzt muss jemand an die 1.', 0, '{"defenders":[{"position":"P","x":173,"y":164},{"position":"C","x":172.82,"y":200.18},{"position":"1B","x":185,"y":186},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":181.65,"y":179.85,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Grounder zum 1B — wer deckt die 1';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1400, 'Wurf zum laufenden Pitcher, er trifft die Base mit dem Fuß.', 0, '{"defenders":[{"position":"P","x":197.43,"y":175.57},{"position":"C","x":172.82,"y":200.18},{"position":"1B","x":185,"y":186},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"P","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Grounder zum 1B — wer deckt die 1';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1600, 'Out.', 1, '{"defenders":[{"position":"P","x":197.43,"y":175.57},{"position":"C","x":172.82,"y":200.18},{"position":"1B","x":185,"y":186},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"P","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Grounder zum 1B — wer deckt die 1';

-- 5. Comebacker zum Pitcher
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Comebacker zum Pitcher', id, 'ANY', NULL
FROM play_category WHERE name = 'Base-Coverage';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner auf 1. Der Schlag kommt hart zurück zum Pitcher.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Comebacker zum Pitcher';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, 'Comebacker — der P fängt ihn selbst.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":182,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Comebacker zum Pitcher';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1400, 'P dreht sich zur 2. Wer dort deckt, ist abgesprochen — hier der 2B.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":174.09,"y":152.24,"status":"ACTIVE"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Comebacker zum Pitcher';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 600, 'Wurf auf die 2.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":174.09,"y":152.24,"status":"OUT"},{"id":"rb","x":180.2,"y":192.8,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Comebacker zum Pitcher';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 5, 1200, 'Und weiter auf die 1.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Comebacker zum Pitcher';

-- 6. Doppelspiel 6-4-3
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Doppelspiel 6-4-3', id, 'ANY', NULL
FROM play_category WHERE name = 'Base-Coverage';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner auf 1, ein Grounder ins Loch — das Standard-Doppelspiel.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Doppelspiel 6-4-3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, 'SS fängt seitlich, 2B ist schon unterwegs zur Base.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":163.63,"y":135.84},{"position":"SS","x":121,"y":148},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":180.46,"y":158.6,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":125.95,"y":152.95,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Doppelspiel 6-4-3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 600, 'Wurf zur 2, der 2B nimmt im Lauf an.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":121,"y":148},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":180.46,"y":158.6,"status":"OUT"},{"id":"rb","x":163.4,"y":209.6,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Doppelspiel 6-4-3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 2200, 'Abdrehen vom Runner weg, dann auf die 1.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":121,"y":148},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Doppelspiel 6-4-3';

-- 7. Single ins LF — Backup hinter der 2
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Single ins LF — Backup hinter der 2', id, 'ANY', NULL
FROM play_category WHERE name = 'Base-Coverage';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Ball fällt ins linke Feld. Jetzt zählt, wer hinter der Base steht.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins LF — Backup hinter der 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2800, 'LF läuft an, CF sichert schräg dahinter ab.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":131.21,"y":65.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":99.63,"y":119.33,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Single ins LF — Backup hinter der 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 2800, 'Wurf auf die 2: SS nimmt an, der 2B steht dahinter. Der P sichert die 3 ab.', 1, '{"defenders":[{"position":"P","x":96.57,"y":187.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":178,"y":141.15},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":131.21,"y":65.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins LF — Backup hinter der 2';

-- 8. Single ins RF — Backup hinter der 1
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Single ins RF — Backup hinter der 1', id, 'ANY', NULL
FROM play_category WHERE name = 'Base-Coverage';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Ball ins rechte Feld, der Batter rundet die 1.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins RF — Backup hinter der 1';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2800, 'RF nimmt auf, 1B kommt zurück zur Base.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":210.37,"y":119.33,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Single ins RF — Backup hinter der 1';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 2600, 'Wurf zurück zur 1, 2B sichert im Foul-Gebiet dahinter ab.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":192.43,"y":192.57},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins RF — Backup hinter der 1';

-- 9. Bases Loaded — Force an Home
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Bases Loaded — Force an Home', id, 'ANY', NULL
FROM play_category WHERE name = 'Base-Coverage';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Bases loaded, ein Out. Der Force gilt an jeder Base — auch an der Platte.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Bases Loaded — Force an Home';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, 'Grounder zum SS. Alle drei müssen laufen.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":129,"y":146},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":184.7,"y":162.85,"status":"ACTIVE"},{"id":"r2","x":142.27,"y":145.88,"status":"ACTIVE"},{"id":"r3","x":125.3,"y":188.3,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":133.1,"y":151.67,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Bases Loaded — Force an Home';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1800, 'Wurf nach Home — der kürzeste Weg und der teuerste Runner.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":129,"y":146},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":167.73,"y":145.88,"status":"ACTIVE"},{"id":"r2","x":125.3,"y":162.85,"status":"ACTIVE"},{"id":"r3","x":155,"y":218,"status":"OUT"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Bases Loaded — Force an Home';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1600, 'Und weiter auf die 1 — Doppelspiel, wenn der Wurf sitzt.', 3, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":129,"y":146},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r2","x":112.57,"y":175.57,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Bases Loaded — Force an Home';

-- 10. Bases Loaded — der 3B tritt selbst auf die 3
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Bases Loaded — der 3B tritt selbst auf die 3', id, 'ANY', NULL
FROM play_category WHERE name = 'Base-Coverage';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Bases loaded, keine Outs. Der Ball kommt scharf zum 3B.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Bases Loaded — der 3B tritt selbst auf die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, 'Grounder zum 3B, nah an der Base.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":116.57,"y":189.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":182.58,"y":160.72,"status":"ACTIVE"},{"id":"r2","x":140.15,"y":148,"status":"ACTIVE"},{"id":"r3","x":127.42,"y":190.42,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":123.44,"y":188.22,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Bases Loaded — der 3B tritt selbst auf die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1800, 'Er tritt selbst auf die Base — der schnellste Force, ganz ohne Wurf.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":167.73,"y":145.88,"status":"ACTIVE"},{"id":"r2","x":112.57,"y":175.57,"status":"OUT"},{"id":"r3","x":142.27,"y":205.27,"status":"ACTIVE"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Bases Loaded — der 3B tritt selbst auf die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1600, 'Dann der lange Wurf auf die 1. Der Run von der 3 zählt — zwei Outs sind mehr wert.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r3","x":142.27,"y":205.27,"status":"SCORED"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Bases Loaded — der 3B tritt selbst auf die 3';

-- 11. Überwurf an der 1 — wer sichert ab
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Überwurf an der 1 — wer sichert ab', id, 'ANY', NULL
FROM play_category WHERE name = 'Base-Coverage';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Der SS hat den Grounder, der Wurf auf die 1 geht zu hoch.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":171.97,"y":201.03,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":133,"y":140,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Überwurf an der 1 — wer sichert ab';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 3000, 'Der Ball fliegt über den 1B hinweg ins Foul-Gebiet.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":231.43,"y":145.57}],"runners":[{"id":"rb","x":193.18,"y":179.82,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":223.42640687119285,"y":189.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Überwurf an der 1 — wer sichert ab';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1600, 'RF war von Anfang an unterwegs — ohne ihn läuft der Runner bis zur 3.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":233.43,"y":179.57}],"runners":[{"id":"rb","x":186.82,"y":164.97,"status":"ACTIVE"}],"ball":{"state":"LOOSE","holder":null,"x":219.42640687119285,"y":185.57359312880715,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Überwurf an der 1 — wer sichert ab';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 2000, 'RF hat ihn, der Runner bleibt auf der 2.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":233.43,"y":179.57}],"runners":[{"id":"rb","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"RF","x":233.42640687119285,"y":179.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Überwurf an der 1 — wer sichert ab';

-- 12. Single ins LF, Runner auf 1 — Wurf auf die 3
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Single ins LF, Runner auf 1 — Wurf auf die 3', id, 'ANY', NULL
FROM play_category WHERE name = 'Cut-off & Relay';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner auf 1 startet mit dem Schlag.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins LF, Runner auf 1 — Wurf auf die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2800, 'Ball fällt vor dem LF auf.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":171.97,"y":150.12,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":99.63,"y":119.33,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Single ins LF, Runner auf 1 — Wurf auf die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 2800, 'SS geht als Cut-Mann auf die Linie LF–3B, der 2B rückt auf die 2, der P hinter die 3.', 0, '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":102.91,"y":141.75},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":138.03,"y":150.12,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":101.9,"y":134.82,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins LF, Runner auf 1 — Wurf auf die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1400, 'Cut lässt durch — der Wurf geht auf die 3.', 0, '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":102.91,"y":141.75},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":116.82,"y":171.33,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins LF, Runner auf 1 — Wurf auf die 3';

-- 13. Single ins CF, Runner auf 1 — Wurf auf die 3
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Single ins CF, Runner auf 1 — Wurf auf die 3', id, 'ANY', NULL
FROM play_category WHERE name = 'Cut-off & Relay';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Ball geht durch die Mitte.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins CF, Runner auf 1 — Wurf auf die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 3000, 'CF läuft an.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":98},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":174.09,"y":152.24,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":105,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Single ins CF, Runner auf 1 — Wurf auf die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 2800, 'SS stellt sich zwischen CF und 3B, der 2B deckt die 2, der P sichert hinter der 3 ab.', 1, '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":133.79,"y":136.79},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":98},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":133.79,"y":154.36,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":137.68,"y":130.97,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins CF, Runner auf 1 — Wurf auf die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1200, 'Wurf durch auf die 3.', 1, '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":133.79,"y":136.79},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":98},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":114.69,"y":173.45,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins CF, Runner auf 1 — Wurf auf die 3';

-- 14. Single ins RF, Runner auf 1 — Wurf auf die 3
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Single ins RF, Runner auf 1 — Wurf auf die 3', id, 'ANY', NULL
FROM play_category WHERE name = 'Cut-off & Relay';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Der längste Weg im Spiel: von rechts auf die 3.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins RF, Runner auf 1 — Wurf auf die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2800, 'RF nimmt den Ball auf.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"r1","x":171.97,"y":150.12,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":210.37,"y":119.33,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Single ins RF, Runner auf 1 — Wurf auf die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 2800, 'Ball rechts, also zieht der 2B als Cut heraus. Der SS deckt die 2, der 3B stellt ihn, der P sichert hinter der 3 ab.', 1, '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":168.91,"y":141.75},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"r1","x":135.91,"y":152.24,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":175.07,"y":138.42,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins RF, Runner auf 1 — Wurf auf die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1200, 'Der Runner war zu weit raus — Wurf auf die 3.', 2, '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":168.91,"y":141.75},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"r1","x":135.91,"y":152.24,"status":"OUT"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins RF, Runner auf 1 — Wurf auf die 3';

-- 15. Single ins LF, Runner auf 2 — Wurf nach Home
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Single ins LF, Runner auf 2 — Wurf nach Home', id, 'CLOSE_LATE', 'Knapp im letzten Inning: der Run darf nicht fallen, alles geht an Home.'
FROM play_category WHERE name = 'Cut-off & Relay';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner auf 2, knapper Spielstand. Der Run entscheidet.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins LF, Runner auf 2 — Wurf nach Home';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2800, 'Ball ins linke Feld, der Runner rundet die 3.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":121.06,"y":167.09,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":99.63,"y":119.33,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Single ins LF, Runner auf 2 — Wurf nach Home';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 3000, 'Der C stellt den SS auf die Linie LF–Home — Ball links, also er. Der 3B bleibt an der 3, der 2B deckt die 2, der P geht hinter die Platte.', 1, '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":119,"y":155.65},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":133.79,"y":196.79,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":115.71,"y":149.47,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins LF, Runner auf 2 — Wurf nach Home';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1200, 'Durchlassen, Wurf nach Home.', 1, '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":119,"y":155.65},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":150.76,"y":213.76,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins LF, Runner auf 2 — Wurf nach Home';

-- 16. Single ins RF, Runner auf 2 — Wurf nach Home
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Single ins RF, Runner auf 2 — Wurf nach Home', id, 'ANY', NULL
FROM play_category WHERE name = 'Cut-off & Relay';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Dasselbe von rechts — hier ist der 2B der Relay.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins RF, Runner auf 2 — Wurf nach Home';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2800, 'RF nimmt auf.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"r2","x":118.94,"y":169.21,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":210.37,"y":119.33,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Single ins RF, Runner auf 2 — Wurf nach Home';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 3000, 'Der C stellt den 2B auf die Linie RF–Home. Der 1B bleibt an der 1, der SS deckt die 2, der P geht hinter die Platte.', 1, '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":218},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":188,"y":160.84},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"r2","x":135.91,"y":198.91,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":191.32,"y":154.68,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins RF, Runner auf 2 — Wurf nach Home';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1200, 'Der Wurf segelt — der Relay nimmt ihn runter. Der Run zählt, der Batter bleibt auf der 1.', 1, '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":218},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":188,"y":160.84},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"r2","x":135.91,"y":198.91,"status":"SCORED"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":188,"y":160.84,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Single ins RF, Runner auf 2 — Wurf nach Home';

-- 17. Double in die linke Gasse — Relay über SS
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Double in die linke Gasse — Relay über SS', id, 'ANY', NULL
FROM play_category WHERE name = 'Cut-off & Relay';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Ball rollt in die linke Gasse. Für einen Wurf ist das zu weit.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Double in die linke Gasse — Relay über SS';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2400, 'LF und CF jagen hinterher, LF hat Vorfahrt.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":41.1,"y":72.22},{"position":"CF","x":107.72,"y":49.28},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":46.14,"y":77.08,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Double in die linke Gasse — Relay über SS';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 3000, 'SS geht weit raus als Relay — ungefähr halbe Strecke.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":76.84,"y":123.9},{"position":"3B","x":119,"y":166},{"position":"LF","x":41.1,"y":72.22},{"position":"CF","x":107.72,"y":49.28},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":171.97,"y":150.12,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":73,"y":118.05,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Double in die linke Gasse — Relay über SS';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 2800, 'Relay dreht und wirft auf die 3 — der P steht dahinter.', 0, '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":76.84,"y":123.9},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":41.1,"y":72.22},{"position":"CF","x":107.72,"y":49.28},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Double in die linke Gasse — Relay über SS';

-- 18. Double in die rechte Gasse — Relay über 2B
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Double in die rechte Gasse — Relay über 2B', id, 'ANY', NULL
FROM play_category WHERE name = 'Cut-off & Relay';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Spiegelbildlich nach rechts: hier geht der 2B raus.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Double in die rechte Gasse — Relay über 2B';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2400, 'RF an der Wand.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":202.28,"y":49.28},{"position":"RF","x":268.9,"y":72.22}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":263.86,"y":77.08,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Double in die rechte Gasse — Relay über 2B';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 3000, '2B als Relay auf halber Strecke.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":211.95,"y":102.68},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":202.28,"y":49.28},{"position":"RF","x":268.9,"y":72.22}],"runners":[{"id":"rb","x":167.73,"y":145.88,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":218.23,"y":99.58,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Double in die rechte Gasse — Relay über 2B';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1200, 'Wurf auf die 2 — SS deckt ab, weil der 2B draußen ist.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":211.95,"y":102.68},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":202.28,"y":49.28},{"position":"RF","x":268.9,"y":72.22}],"runners":[{"id":"rb","x":157.12,"y":135.27,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Double in die rechte Gasse — Relay über 2B';

-- 19. Tiefes RF, Doppel-Relay
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Tiefes RF, Doppel-Relay', id, 'ANY', NULL
FROM play_category WHERE name = 'Cut-off & Relay';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Ganz tief rechts. Eine Kette aus zwei Spielern ist schneller als ein weiter Wurf.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Tiefes RF, Doppel-Relay';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2400, 'RF am Zaun.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":283.56,"y":64.79}],"runners":[{"id":"r1","x":159.24,"y":137.39,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":278.39,"y":69.51,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Tiefes RF, Doppel-Relay';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 2600, '2B als erster Relay, 1B als zweiter dahinter.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":193.57,"y":172.04},{"position":"2B","x":225.71,"y":133.73},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":283.56,"y":64.79}],"runners":[{"id":"r1","x":129.54,"y":158.6,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":230.15,"y":128.32,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Tiefes RF, Doppel-Relay';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 3000, 'Erster Relay wirft zum zweiten, P geht hinter die Platte.', 0, '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":226},{"position":"1B","x":193.57,"y":172.04},{"position":"2B","x":225.71,"y":133.73},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":283.56,"y":64.79}],"runners":[{"id":"r1","x":133.79,"y":196.79,"status":"ACTIVE"},{"id":"rb","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"1B","x":193.57,"y":172.04,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Tiefes RF, Doppel-Relay';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 5, 1200, 'Von dort nach Home. Der Run fällt trotzdem — dafür bleibt der Batter auf der 2.', 0, '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":218},{"position":"1B","x":193.57,"y":172.04},{"position":"2B","x":225.71,"y":133.73},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":283.56,"y":64.79}],"runners":[{"id":"r1","x":133.79,"y":196.79,"status":"SCORED"},{"id":"rb","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Tiefes RF, Doppel-Relay';

-- 20. Sac-Bunt, Runner auf 1 — sicherer Out an der 1
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Sac-Bunt, Runner auf 1 — sicherer Out an der 1', id, 'ANY', NULL
FROM play_category WHERE name = 'Bunt-Defense';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner auf 1, keine Outs. Der Bunt kommt.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Sac-Bunt, Runner auf 1 — sicherer Out an der 1';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2000, 'P und 3B stürmen vor, 1B kommt von rechts.', 0, '{"defenders":[{"position":"P","x":155,"y":201},{"position":"C","x":155,"y":226},{"position":"1B","x":173.92,"y":190.67},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":136.08,"y":190.67},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":184.7,"y":162.85,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"LOOSE","holder":null,"x":147,"y":204,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Sac-Bunt, Runner auf 1 — sicherer Out an der 1';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, 'P nimmt den Ball auf — er ist am nächsten dran.', 0, '{"defenders":[{"position":"P","x":147,"y":204},{"position":"C","x":155,"y":226},{"position":"1B","x":173.92,"y":190.67},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":136.08,"y":190.67},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":171.97,"y":150.12,"status":"ACTIVE"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"P","x":147,"y":204,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Sac-Bunt, Runner auf 1 — sicherer Out an der 1';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1600, 'Sicherer Wurf auf die 1 — der 2B deckt dort ab, weil der 1B vorne ist.', 1, '{"defenders":[{"position":"P","x":147,"y":204},{"position":"C","x":155,"y":226},{"position":"1B","x":173.92,"y":190.67},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":136.08,"y":190.67},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"2B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Sac-Bunt, Runner auf 1 — sicherer Out an der 1';

-- 21. Sac-Bunt, Runner auf 1 — Wurf auf die 2
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Sac-Bunt, Runner auf 1 — Wurf auf die 2', id, 'CLOSE_LATE', 'Den Führungs-Runner nehmen, wenn der Bunt hart genug ist.'
FROM play_category WHERE name = 'Bunt-Defense';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Derselbe Bunt, andere Entscheidung: wir wollen den vorderen Runner.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Sac-Bunt, Runner auf 1 — Wurf auf die 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2000, 'Bunt rollt hart genug zum 3B.', 0, '{"defenders":[{"position":"P","x":155,"y":195},{"position":"C","x":155,"y":226},{"position":"1B","x":175.06,"y":189.02},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":138.35,"y":193.95},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":184.7,"y":162.85,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"LOOSE","holder":null,"x":139,"y":200,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Sac-Bunt, Runner auf 1 — Wurf auf die 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, '3B nimmt auf und schaut sofort zur 2.', 0, '{"defenders":[{"position":"P","x":155,"y":195},{"position":"C","x":155,"y":226},{"position":"1B","x":175.06,"y":189.02},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":139,"y":200},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":171.97,"y":150.12,"status":"ACTIVE"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":139,"y":200,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Sac-Bunt, Runner auf 1 — Wurf auf die 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1200, 'Wurf auf die 2 — SS deckt ab. Nur machen, wenn der Ball schnell in der Hand ist.', 1, '{"defenders":[{"position":"P","x":155,"y":195},{"position":"C","x":155,"y":226},{"position":"1B","x":175.06,"y":189.02},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":139,"y":200},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":171.97,"y":150.12,"status":"OUT"},{"id":"rb","x":188.6,"y":184.4,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Sac-Bunt, Runner auf 1 — Wurf auf die 2';

-- 22. Bunt Richtung 3B, Runner auf 2 — SS deckt die 3
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Bunt Richtung 3B, Runner auf 2 — SS deckt die 3', id, 'ANY', NULL
FROM play_category WHERE name = 'Bunt-Defense';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner auf 2. Der Bunt soll ihn auf die 3 bringen.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Bunt Richtung 3B, Runner auf 2 — SS deckt die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2000, '3B muss vor — damit ist die 3 offen.', 0, '{"defenders":[{"position":"P","x":155,"y":193},{"position":"C","x":155,"y":226},{"position":"1B","x":175.06,"y":189.02},{"position":"2B","x":177,"y":140},{"position":"SS","x":112.57,"y":175.57},{"position":"3B","x":139.49,"y":195.6},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":140.15,"y":148,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"LOOSE","holder":null,"x":137,"y":202,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Bunt Richtung 3B, Runner auf 2 — SS deckt die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, 'SS füllt die Lücke an der 3. Ohne ihn läuft der Runner einfach durch.', 0, '{"defenders":[{"position":"P","x":155,"y":193},{"position":"C","x":155,"y":226},{"position":"1B","x":175.06,"y":189.02},{"position":"2B","x":177,"y":140},{"position":"SS","x":112.57,"y":175.57},{"position":"3B","x":137,"y":202},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":125.3,"y":162.85,"status":"ACTIVE"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":137,"y":202,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Bunt Richtung 3B, Runner auf 2 — SS deckt die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 2000, 'Wurf auf die 1 — der 2B deckt, weil der 1B vorne ist. Der Runner bekommt die 3.', 1, '{"defenders":[{"position":"P","x":155,"y":193},{"position":"C","x":155,"y":226},{"position":"1B","x":175.06,"y":189.02},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":112.57,"y":175.57},{"position":"3B","x":137,"y":202},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":112.57,"y":175.57,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"2B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Bunt Richtung 3B, Runner auf 2 — SS deckt die 3';

-- 23. Runner auf 1 und 2 — Wheel Play
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Runner auf 1 und 2 — Wheel Play', id, 'ANY', NULL
FROM play_category WHERE name = 'Bunt-Defense';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner auf 1 und 2. Beim Wheel dreht sich das ganze Infield.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Runner auf 1 und 2 — Wheel Play';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2000, '3B stürmt, SS rotiert zur 3, 2B zur 1.', 0, '{"defenders":[{"position":"P","x":155,"y":195},{"position":"C","x":155,"y":226},{"position":"1B","x":173.92,"y":190.67},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":112.57,"y":175.57},{"position":"3B","x":140.63,"y":197.24},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":184.7,"y":162.85,"status":"ACTIVE"},{"id":"r2","x":142.27,"y":145.88,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"LOOSE","holder":null,"x":135,"y":200,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Runner auf 1 und 2 — Wheel Play';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1800, '3B nimmt auf und wirft zur 3 — der Führungs-Runner ist das Ziel.', 1, '{"defenders":[{"position":"P","x":155,"y":195},{"position":"C","x":155,"y":226},{"position":"1B","x":173.92,"y":190.67},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":112.57,"y":175.57},{"position":"3B","x":135,"y":200},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":167.73,"y":145.88,"status":"ACTIVE"},{"id":"r2","x":112.57,"y":175.57,"status":"OUT"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Runner auf 1 und 2 — Wheel Play';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 2000, 'Alternative zum Stand davor: Ist der Führungs-Runner zu schnell, geht der Wurf an die 1 — ein sicherer Out statt gar keiner.', 1, '{"defenders":[{"position":"P","x":155,"y":195},{"position":"C","x":155,"y":226},{"position":"1B","x":173.92,"y":190.67},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":112.57,"y":175.57},{"position":"3B","x":135,"y":200},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"2B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Runner auf 1 und 2 — Wheel Play';

-- 24. Squeeze, Runner auf 3
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Squeeze, Runner auf 3', id, 'ANY', NULL
FROM play_category WHERE name = 'Bunt-Defense';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner auf 3. Der Squeeze startet mit dem Wurf — es bleibt keine Zeit zum Überlegen.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Squeeze, Runner auf 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1400, 'Runner läuft los, der Bunt geht vor Home.', 1, '{"defenders":[{"position":"P","x":155,"y":199},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":133.79,"y":196.79,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"LOOSE","holder":null,"x":161,"y":208,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Squeeze, Runner auf 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, 'Der P nimmt den Ball — der C bleibt an der Platte, sonst deckt sie niemand.', 1, '{"defenders":[{"position":"P","x":161,"y":208},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":146.51,"y":209.51,"status":"ACTIVE"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"P","x":161,"y":208,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Squeeze, Runner auf 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 600, 'Kurzer Wurf zum Catcher, Tag — nur wenn der Ball früh genug da ist.', 2, '{"defenders":[{"position":"P","x":161,"y":208},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":146.51,"y":209.51,"status":"OUT"},{"id":"rb","x":180.2,"y":192.8,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Squeeze, Runner auf 3';

-- 25. Bunt direkt vor Home — Catcher übernimmt
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Bunt direkt vor Home — Catcher übernimmt', id, 'ANY', NULL
FROM play_category WHERE name = 'Bunt-Defense';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Der Bunt bleibt direkt vor der Platte liegen.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Bunt direkt vor Home — Catcher übernimmt';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2000, 'P stürmt, bleibt aber stehen: der Ball gehört dem Catcher.', 1, '{"defenders":[{"position":"P","x":141,"y":198},{"position":"C","x":155,"y":212},{"position":"1B","x":175.06,"y":189.02},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"LOOSE","holder":null,"x":155,"y":210,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Bunt direkt vor Home — Catcher übernimmt';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, 'C hat freie Sicht auf die 1 — der P ist aus der Wurflinie gegangen.', 1, '{"defenders":[{"position":"P","x":141,"y":198},{"position":"C","x":155,"y":212},{"position":"1B","x":175.06,"y":189.02},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":212,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Bunt direkt vor Home — Catcher übernimmt';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1600, 'Wurf auf die 1.', 2, '{"defenders":[{"position":"P","x":141,"y":198},{"position":"C","x":155,"y":212},{"position":"1B","x":175.06,"y":189.02},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"2B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Bunt direkt vor Home — Catcher übernimmt';

-- 26. Wurf auf die 2, Runner auf 3 startet
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Wurf auf die 2, Runner auf 3 startet', id, 'ANY', NULL
FROM play_category WHERE name = 'First-and-Third';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner auf 1 und 3. Der auf 1 läuft — und will genau das.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Wurf auf die 2, Runner auf 3 startet';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1600, 'C wirft auf die 2, der Runner von der 3 startet sofort.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":171.97,"y":150.12,"status":"ACTIVE"},{"id":"r3","x":127.42,"y":190.42,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":167.09,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Wurf auf die 2, Runner auf 3 startet';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, 'SS fängt und wirft sofort zurück nach Home.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":161.36,"y":139.51,"status":"ACTIVE"},{"id":"r3","x":138.03,"y":201.03,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Wurf auf die 2, Runner auf 3 startet';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1200, 'Zurück zur Platte — der Run ist wichtiger als der Out an der 2.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r3","x":138.03,"y":201.03,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Wurf auf die 2, Runner auf 3 startet';

-- 27. Catcher wirft an den Pitcher — Abfangen in der Mitte
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Catcher wirft an den Pitcher — Abfangen in der Mitte', id, 'CLOSE_LATE', 'Wenn der Run zählt: gar nicht erst zur 2 werfen.'
FROM play_category WHERE name = 'First-and-Third';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Dieselbe Lage, knapper Spielstand. Der Ball ist beim Catcher.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Catcher wirft an den Pitcher — Abfangen in der Mitte';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1400, 'C wirft scheinbar zur 2 — der P fängt den Ball ab.', 1, '{"defenders":[{"position":"P","x":155,"y":169},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":176.21,"y":154.36,"status":"ACTIVE"},{"id":"r3","x":125.3,"y":188.3,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"P","x":155,"y":169,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Catcher wirft an den Pitcher — Abfangen in der Mitte';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, 'P dreht sich zum Runner auf 3. Der muss zurück.', 1, '{"defenders":[{"position":"P","x":155,"y":169},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":163.49,"y":141.63,"status":"ACTIVE"},{"id":"r3","x":118.94,"y":181.94,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"P","x":155,"y":169,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Catcher wirft an den Pitcher — Abfangen in der Mitte';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 2000, 'Der Runner auf 1 bekommt die 2 geschenkt — der Run zählt mehr.', 1, '{"defenders":[{"position":"P","x":155,"y":169},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"P","x":155,"y":169,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Catcher wirft an den Pitcher — Abfangen in der Mitte';

-- 28. Angetäuschter Wurf auf die 2
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Angetäuschter Wurf auf die 2', id, 'ANY', NULL
FROM play_category WHERE name = 'First-and-Third';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Der Catcher täuscht den Wurf nur an.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Angetäuschter Wurf auf die 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, 'Arm hoch, Ball bleibt in der Hand.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":178.33,"y":156.48,"status":"ACTIVE"},{"id":"r3","x":125.3,"y":188.3,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Angetäuschter Wurf auf die 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 600, 'Der Runner auf 3 ist zu weit raus.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":178.33,"y":156.48,"status":"ACTIVE"},{"id":"r3","x":127.42,"y":190.42,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Angetäuschter Wurf auf die 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1200, 'Wurf auf die 3 — Tag-Out, wenn er nicht zurückkommt.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":178.33,"y":156.48,"status":"ACTIVE"},{"id":"r3","x":127.42,"y":190.42,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Angetäuschter Wurf auf die 2';

-- 29. Direkter Wurf auf die 3
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Direkter Wurf auf die 3', id, 'ANY', NULL
FROM play_category WHERE name = 'First-and-Third';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Zwei Outs. Jetzt zählt nur noch der dritte, egal wo.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Direkter Wurf auf die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, 'Der C hat den Ball, der Runner auf 3 nimmt zu viel Abstand.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r3","x":123.18,"y":186.18,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Direkter Wurf auf die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 600, 'Schneller Wurf auf die 3 — vom Catcher, nicht vom Pitcher.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r3","x":118.94,"y":181.94,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Direkter Wurf auf die 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1200, 'Tag — Inning vorbei.', 3, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r3","x":118.94,"y":181.94,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Direkter Wurf auf die 3';

-- 30. Rundown zwischen Home und 1
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Rundown zwischen Home und 1', id, 'ANY', NULL
FROM play_category WHERE name = 'Rundown';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Der Batter hängt zwischen Home und der 1.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":176.21,"y":196.79,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Rundown zwischen Home und 1';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, '1B hat den Ball und läuft ihn an — nicht werfen, laufen.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":186.82,"y":186.18},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":169.85,"y":203.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"1B","x":186.82,"y":186.18,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Rundown zwischen Home und 1';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 600, 'Erst wenn der Runner festgelegt ist: ein Wurf zum Catcher.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":186.82,"y":186.18},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":163.49,"y":209.51,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Rundown zwischen Home und 1';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 600, 'Tag. Ein Wurf reicht, wenn man ihn richtig anläuft.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":186.82,"y":186.18},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":163.49,"y":209.51,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Rundown zwischen Home und 1';

-- 31. Rundown zwischen 1 und 2
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Rundown zwischen 1 und 2', id, 'ANY', NULL
FROM play_category WHERE name = 'Rundown';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner steckt zwischen 1 und 2.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":176.21,"y":154.36,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Rundown zwischen 1 und 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, '2B läuft ihn Richtung 1 zurück.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":167.73,"y":145.88},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":182.58,"y":160.72,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":167.73,"y":145.88,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Rundown zwischen 1 und 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 600, 'Wurf zum 1B, sobald der Runner festgelegt ist.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":167.73,"y":145.88},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":191.06,"y":169.21,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Rundown zwischen 1 und 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 600, 'Tag an der 1.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":167.73,"y":145.88},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":191.06,"y":169.21,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Rundown zwischen 1 und 2';

-- 32. Rundown zwischen 2 und 3
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Rundown zwischen 2 und 3', id, 'ANY', NULL
FROM play_category WHERE name = 'Rundown';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Zwischen 2 und 3 — hier sind SS und 3B zuständig.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":133.79,"y":154.36,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Rundown zwischen 2 und 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, 'SS treibt ihn zurück zur 2.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":125.3,"y":162.85},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":142.27,"y":145.88,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":125.3,"y":162.85,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Rundown zwischen 2 und 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 600, 'Wurf zum 2B an der Base.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":125.3,"y":162.85},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":149.91,"y":138.24,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Rundown zwischen 2 und 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 600, 'Tag.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":125.3,"y":162.85},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":149.91,"y":138.24,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Rundown zwischen 2 und 3';

-- 33. Rundown zwischen 3 und Home
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Rundown zwischen 3 und Home', id, 'ANY', NULL
FROM play_category WHERE name = 'Rundown';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Der teuerste Rundown: hier geht es um einen Run.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":133.79,"y":196.79,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Rundown zwischen 3 und Home';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1600, 'C läuft ihn zur 3 zurück. Der Runner darf nicht nach Home.', 1, '{"defenders":[{"position":"P","x":154.15,"y":217.15},{"position":"C","x":142.27,"y":205.27},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":125.3,"y":188.3,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":142.27,"y":205.27,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Rundown zwischen 3 und Home';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 600, 'Wurf zum 3B.', 1, '{"defenders":[{"position":"P","x":154.15,"y":217.15},{"position":"C","x":142.27,"y":205.27},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":117.66,"y":180.66,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Rundown zwischen 3 und Home';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 600, 'Tag an der 3. P ist nachgerückt, falls der Wurf danebengeht.', 2, '{"defenders":[{"position":"P","x":154.15,"y":217.15},{"position":"C","x":142.27,"y":205.27},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":117.66,"y":180.66,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Rundown zwischen 3 und Home';

-- 34. Pop-up hinter der 1 — wer ruft
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Pop-up hinter der 1 — wer ruft', id, 'ANY', NULL
FROM play_category WHERE name = 'Pop-up-Priorities';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Hoher Ball hinter die erste Base. Drei könnten ihn fangen.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pop-up hinter der 1 — wer ruft';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 3000, '1B, 2B und RF laufen alle an.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":211.43,"y":155.57},{"position":"2B","x":201.43,"y":145.57},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":221.43,"y":135.57}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":207.42640687119285,"y":147.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pop-up hinter der 1 — wer ruft';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1800, 'Der Outfielder hat Vorfahrt — er läuft nach vorne, die anderen rückwärts.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":203.43,"y":165.57},{"position":"2B","x":191.43,"y":157.57},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":221.43,"y":135.57}],"runners":[{"id":"rb","x":184.7,"y":188.3,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"RF","x":221.42640687119285,"y":135.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pop-up hinter der 1 — wer ruft';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 600, 'RF ruft, die anderen weichen. Out.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":203.43,"y":165.57},{"position":"2B","x":191.43,"y":157.57},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":221.43,"y":135.57}],"runners":[{"id":"rb","x":184.7,"y":188.3,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"RF","x":221.42640687119285,"y":135.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pop-up hinter der 1 — wer ruft';

-- 35. Pop-up hinter der 3 — wer ruft
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Pop-up hinter der 3 — wer ruft', id, 'ANY', NULL
FROM play_category WHERE name = 'Pop-up-Priorities';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Spiegelbildlich an der dritten Base.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pop-up hinter der 3 — wer ruft';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 3000, '3B, SS und LF kommen zusammen.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":110.57,"y":147.57},{"position":"3B","x":100.57,"y":157.57},{"position":"LF","x":90.57,"y":137.57},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":102.57359312880715,"y":149.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pop-up hinter der 3 — wer ruft';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, 'LF ruft — Outfielder vor Infielder, immer.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":110.57,"y":147.57},{"position":"3B","x":100.57,"y":157.57},{"position":"LF","x":90.57,"y":137.57},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"LF","x":90.57359312880715,"y":137.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pop-up hinter der 3 — wer ruft';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 600, 'Out.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":110.57,"y":147.57},{"position":"3B","x":100.57,"y":157.57},{"position":"LF","x":90.57,"y":137.57},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":171.8,"y":201.2,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"LF","x":90.57359312880715,"y":137.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pop-up hinter der 3 — wer ruft';

-- 36. Pop-up hinterm Infield, Mitte
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Pop-up hinterm Infield, Mitte', id, 'ANY', NULL
FROM play_category WHERE name = 'Pop-up-Priorities';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Der unangenehmste Ball: hinter 2 und vor dem CF.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pop-up hinterm Infield, Mitte';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2800, 'SS, 2B und CF laufen an.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":165,"y":111.15},{"position":"SS","x":145,"y":111.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":91.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":105.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pop-up hinterm Infield, Mitte';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, 'CF kommt von hinten und ruft ab — er sieht den Ball im Laufen besser.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":165,"y":111.15},{"position":"SS","x":145,"y":111.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":105.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"CF","x":155,"y":105.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pop-up hinterm Infield, Mitte';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 600, 'SS und 2B drehen weg. Out.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":175,"y":121.15},{"position":"SS","x":135,"y":121.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":105.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":171.8,"y":201.2,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"CF","x":155,"y":105.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pop-up hinterm Infield, Mitte';

-- 37. Foul-Pop hinter Home
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Foul-Pop hinter Home', id, 'ANY', NULL
FROM play_category WHERE name = 'Pop-up-Priorities';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Foul-Pop hinter der Platte. Der Catcher dreht sich — mit dem Rücken zum Feld.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Foul-Pop hinter Home';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2800, 'C sucht den Ball, 1B und 3B kommen zur Hilfe.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":161,"y":234},{"position":"1B","x":181,"y":224},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":129,"y":224},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":165,"y":238,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Foul-Pop hinter Home';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, 'C hat ihn. Der Ball dreht zurück Richtung Feld — deshalb mit dem Rücken dorthin stehen.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":161,"y":234},{"position":"1B","x":181,"y":224},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":129,"y":224},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":161,"y":234,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Foul-Pop hinter Home';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 600, 'Out.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":161,"y":234},{"position":"1B","x":181,"y":224},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":129,"y":224},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":171.8,"y":201.2,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"C","x":161,"y":234,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Foul-Pop hinter Home';

-- 38. Infield Fly — Lage und Verhalten
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Infield Fly — Lage und Verhalten', id, 'ANY', NULL
FROM play_category WHERE name = 'Pop-up-Priorities';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner auf 1 und 2, weniger als zwei Outs: Infield Fly ist möglich.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Infield Fly — Lage und Verhalten';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, 'Hoher Ball über dem Infield — der Umpire ruft.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":149,"y":143.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":149,"y":135.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Infield Fly — Lage und Verhalten';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, 'Der Batter ist raus, egal ob gefangen wird. Die Runner bleiben stehen.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":149,"y":143.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"SS","x":149,"y":143.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Infield Fly — Lage und Verhalten';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 2000, 'Alternative: Fällt der Ball — trotzdem Out, und die Runner müssen nicht laufen.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":149,"y":143.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":149,"y":143.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Infield Fly — Lage und Verhalten';

-- 39. Steal auf die 2 — Wurf und Abdeckung
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Steal auf die 2 — Wurf und Abdeckung', id, 'ANY', NULL
FROM play_category WHERE name = 'Steal-Defense & Pickoff';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner auf 1 startet mit dem Wurf.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Steal auf die 2 — Wurf und Abdeckung';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, 'C steht auf, SS geht zur Base. Wer deckt, ist vorher abgesprochen.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":180.46,"y":158.6,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Steal auf die 2 — Wurf und Abdeckung';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, 'Wurf auf die 2.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":165.61,"y":143.75,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":158.6,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Steal auf die 2 — Wurf und Abdeckung';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 600, 'SS fängt und tagt.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":165.61,"y":143.75,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Steal auf die 2 — Wurf und Abdeckung';

-- 40. Steal auf die 3 — Wurf und Abdeckung
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Steal auf die 3 — Wurf und Abdeckung', id, 'ANY', NULL
FROM play_category WHERE name = 'Steal-Defense & Pickoff';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Steal auf die 3 kommt seltener — und überrascht deshalb öfter.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Steal auf die 3 — Wurf und Abdeckung';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 3000, '3B zur Base, SS und LF sichern hinter der 3 ab.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":96.57,"y":163.57},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":78.57,"y":145.57},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":138.03,"y":150.12,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Steal auf die 3 — Wurf und Abdeckung';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, 'Wurf die Linie entlang — am Runner vorbei.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":96.57,"y":163.57},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":78.57,"y":145.57},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":121.06,"y":167.09,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":125.3,"y":188.3,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Steal auf die 3 — Wurf und Abdeckung';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 600, '3B tagt.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":96.57,"y":163.57},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":78.57,"y":145.57},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":121.06,"y":167.09,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Steal auf die 3 — Wurf und Abdeckung';

-- 41. Doppel-Steal, Runner auf 1 und 2
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Doppel-Steal, Runner auf 1 und 2', id, 'ANY', NULL
FROM play_category WHERE name = 'Steal-Defense & Pickoff';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Beide laufen. Man kann nur einen bekommen.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Doppel-Steal, Runner auf 1 und 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, 'Der Führungs-Runner geht auf die 3.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":180.46,"y":158.6,"status":"ACTIVE"},{"id":"r2","x":138.03,"y":150.12,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Doppel-Steal, Runner auf 1 und 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, 'Wurf auf die 3 — der vordere Runner zählt mehr.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":163.49,"y":141.63,"status":"ACTIVE"},{"id":"r2","x":121.06,"y":167.09,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":125.3,"y":188.3,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Doppel-Steal, Runner auf 1 und 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1200, 'Out an der 3, die 2 schenken wir her.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r2","x":121.06,"y":167.09,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Doppel-Steal, Runner auf 1 und 2';

-- 42. Pickoff an der 1
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Pickoff an der 1', id, 'ANY', NULL
FROM play_category WHERE name = 'Steal-Defense & Pickoff';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Der Runner nimmt zu viel Abstand.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":189.65,"y":167.8,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pickoff an der 1';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, 'C hat den Ball und wirft sofort zur 1.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":189.65,"y":167.8,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pickoff an der 1';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 600, '1B fängt an der Base.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":189.65,"y":167.8,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pickoff an der 1';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 600, 'Tag, bevor der Runner zurück ist.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":189.65,"y":167.8,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pickoff an der 1';

-- 43. Pickoff an der 2
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Pickoff an der 2', id, 'ANY', NULL
FROM play_category WHERE name = 'Steal-Defense & Pickoff';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'An der 2 braucht es ein Zeichen — der Runner sieht den Deckenden nicht.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":147.22,"y":140.93,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pickoff an der 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, 'SS schleicht hinter dem Runner zur Base.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":145,"y":129.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":147.22,"y":140.93,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pickoff an der 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 600, 'Wurf, SS ist genau rechtzeitig da.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":147.22,"y":140.93,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pickoff an der 2';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 600, 'Tag. Timing ist alles — zu früh und der Runner sieht ihn kommen.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":147.22,"y":140.93,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pickoff an der 2';

-- 44. Pickoff an der 3
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Pickoff an der 3', id, 'ANY', NULL
FROM play_category WHERE name = 'Steal-Defense & Pickoff';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Der riskanteste Pickoff: hinter der 3 steht niemand, der absichert.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":120.35,"y":183.35,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pickoff an der 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, '3B geht zurück zur Base, sobald der Wurf durch ist.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":120.35,"y":183.35,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pickoff an der 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 600, 'Schneller Wurf.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":120.35,"y":183.35,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pickoff an der 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 600, 'Tag. Geht der Wurf daneben, fällt der Run — nur bei sicherem Vorsprung.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":120.35,"y":183.35,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Pickoff an der 3';

-- 45. Delayed Steal
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Delayed Steal', id, 'ANY', NULL
FROM play_category WHERE name = 'Steal-Defense & Pickoff';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Der Runner läuft nicht mit dem Wurf, sondern erst, wenn der C zurückwirft.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Delayed Steal';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, 'C wirft lässig zum Pitcher zurück — genau da startet der Runner.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":184.7,"y":162.85,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Delayed Steal';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1400, 'P sieht es und wirft zur 2, der 2B deckt.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":163.49,"y":141.63,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Delayed Steal';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 2000, 'Knapp. Dagegen hilft nur: nach jedem Wurf hinschauen.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Delayed Steal';

-- 46. Standard-Aufstellung
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Standard-Aufstellung', id, 'ANY', NULL
FROM play_category WHERE name = 'Spielsituationen';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 2000, 'So steht das Team, wenn nichts dagegen spricht. Ausgangspunkt für jedes neue Play.', 0, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[],"ball":{"state":"AT_BAT","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Standard-Aufstellung';

-- 47. Infield In, Runner auf 3
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Infield In, Runner auf 3', id, 'CLOSE_LATE', 'Der Run entscheidet das Spiel — wir geben Hits auf, um ihn zu halten.'
FROM play_category WHERE name = 'Spielsituationen';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner auf 3, knapp am Ende. Der Run darf nicht fallen.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Infield In, Runner auf 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2000, 'Das ganze Infield rückt auf Base-Höhe vor.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191.43,"y":185.57},{"position":"2B","x":175,"y":158},{"position":"SS","x":135,"y":158},{"position":"3B","x":118.57,"y":185.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Infield In, Runner auf 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, 'Jeder Grounder geht jetzt nach Home statt auf die 1.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191.43,"y":185.57},{"position":"2B","x":175,"y":158},{"position":"SS","x":135,"y":158},{"position":"3B","x":118.57,"y":185.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":129.54,"y":192.54,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"LOOSE","holder":null,"x":141,"y":178,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Infield In, Runner auf 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1200, 'SS nimmt auf und wirft zum Catcher.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191.43,"y":185.57},{"position":"2B","x":175,"y":158},{"position":"SS","x":141,"y":178},{"position":"3B","x":118.57,"y":185.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":129.54,"y":192.54,"status":"OUT"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Infield In, Runner auf 3';

-- 48. Outfield tief, Vorsprung halten
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Outfield tief, Vorsprung halten', id, 'AHEAD', 'Mit Vorsprung: kein Ball darf über die Köpfe gehen, Singles sind egal.'
FROM play_category WHERE name = 'Spielsituationen';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Wir führen. Jetzt zählt nur, dass nichts über die Köpfe geht.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[],"ball":{"state":"AT_BAT","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Outfield tief, Vorsprung halten';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 2000, 'Das Outfield geht zwanzig Fuß tiefer als sonst.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":54,"y":43.06},{"position":"CF","x":155,"y":13},{"position":"RF","x":256,"y":43.06}],"runners":[],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Outfield tief, Vorsprung halten';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 3000, 'Der Ball fällt davor — ein Single, aber kein Extra-Base-Hit.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":54,"y":43.06},{"position":"CF","x":181.05,"y":70.28},{"position":"RF","x":256,"y":43.06}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":179.46,"y":77.1,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Outfield tief, Vorsprung halten';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 2600, 'Aufnehmen, kurz halten, fertig.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":54,"y":43.06},{"position":"CF","x":181.05,"y":70.28},{"position":"RF","x":256,"y":43.06}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"CF","x":181.05,"y":70.28,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Outfield tief, Vorsprung halten';

-- 49. Ball am Zaun — Relay-Kette
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Ball am Zaun — Relay-Kette', id, 'ANY', NULL
FROM play_category WHERE name = 'Cut-off & Relay';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Der Ball springt an den Zaun. Jetzt zählt die Kette.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Ball am Zaun — Relay-Kette';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 3000, 'CF jagt ihm nach, SS geht als Relay raus.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":169.75,"y":70.6},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":184.5,"y":8.06},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":159.24,"y":137.39,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":183.33,"y":14.96,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Ball am Zaun — Relay-Kette';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 2600, '2B stellt sich hinter den SS — falls der Wurf daneben geht.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":164.44,"y":93.12},{"position":"SS","x":169.75,"y":70.6},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":184.5,"y":8.06},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":129.54,"y":158.6,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":169.75,"y":70.6,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Ball am Zaun — Relay-Kette';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 3000, 'SS wirft zum 2B, nicht quer übers halbe Feld — und der P geht hinter die Platte.', 1, '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":164.44,"y":93.12},{"position":"SS","x":169.75,"y":70.6},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":184.5,"y":8.06},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":133.79,"y":196.79,"status":"ACTIVE"},{"id":"rb","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":164.44,"y":93.12,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Ball am Zaun — Relay-Kette';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 5, 1200, 'Von dort nach Home. Der Run fällt — wichtig ist, dass der Batter auf der 2 bleibt.', 1, '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":164.44,"y":93.12},{"position":"SS","x":169.75,"y":70.6},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":184.5,"y":8.06},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":133.79,"y":196.79,"status":"SCORED"},{"id":"rb","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Ball am Zaun — Relay-Kette';

-- 50. Runner auf 2 und 3 — anschauen, dann werfen
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Runner auf 2 und 3 — anschauen, dann werfen', id, 'CLOSE_LATE', 'Knapp: der sichere Out ist mehr wert als der Versuch am Runner.'
FROM play_category WHERE name = 'Spielsituationen';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Runner auf 2 und 3, ein Out. Kein Force — die beiden MÜSSEN nicht laufen.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Runner auf 2 und 3 — anschauen, dann werfen';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, 'Grounder zum SS. Der Runner auf 3 testet ihn.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":129,"y":146},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":147.93,"y":140.22,"status":"ACTIVE"},{"id":"r3","x":121.06,"y":184.06,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":133.1,"y":151.67,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Runner auf 2 und 3 — anschauen, dann werfen';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, 'Anschauen. Erst wenn er steht, geht der Wurf — sonst läuft er los.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":129,"y":146},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":147.93,"y":140.22,"status":"ACTIVE"},{"id":"r3","x":116.82,"y":179.82,"status":"ACTIVE"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":133.1,"y":151.67,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Runner auf 2 und 3 — anschauen, dann werfen';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 1600, 'Out an der 1, der Run fällt nicht. Dafür bleiben beide, wo sie sind.', 2, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":129,"y":146},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Runner auf 2 und 3 — anschauen, dann werfen';

-- 51. Passed Ball, Runner auf 3
INSERT INTO play (title, category_id, game_state, game_state_note)
SELECT 'Passed Ball, Runner auf 3', id, 'ANY', NULL
FROM play_category WHERE name = 'Spielsituationen';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 1, 1200, 'Der Ball geht am Catcher vorbei. Der Runner auf 3 startet.', 1, '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Passed Ball, Runner auf 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 2, 1200, 'C dreht sich um und sucht, P startet Richtung Home.', 1, '{"defenders":[{"position":"P","x":155,"y":205},{"position":"C","x":145,"y":240},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":131.67,"y":194.67,"status":"ACTIVE"}],"ball":{"state":"LOOSE","holder":null,"x":141,"y":244,"trajectory":"GROUND"}}'::jsonb
FROM play WHERE title = 'Passed Ball, Runner auf 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 3, 1200, 'P deckt die Platte ab — das ist seine Aufgabe, nicht die des 1B.', 1, '{"defenders":[{"position":"P","x":155,"y":218},{"position":"C","x":145,"y":240},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":144.39,"y":207.39,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":145,"y":240,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Passed Ball, Runner auf 3';
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 4, 600, 'Wurf zum Pitcher an der Platte, Tag.', 2, '{"defenders":[{"position":"P","x":155,"y":218},{"position":"C","x":145,"y":240},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":144.39,"y":207.39,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"P","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Passed Ball, Runner auf 3';

-- 51 Plays.