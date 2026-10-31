-- Korrektur der Start-Plays. Erzeugt von scripts/build-seed-plays.mjs --seit <migration>.
--
-- Eine schon angewandte Migration wird NICHT geaendert: das waere eine Pruefsummen-
-- Kollision, Flyway braeche ab und das Backend startete nicht mehr.

-- Grounder zum SS — wer deckt die 2 – Stand 2
UPDATE play_step SET
    duration_ms = 1400,
    note = 'SS fängt, 2B kommt zur Base — nicht SS, der hat den Ball.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":129,"y":144},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":176.21,"y":154.36,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":132.95,"y":149.78,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Grounder zum SS — wer deckt die 2');

-- Grounder zum SS — wer deckt die 2 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Wurf auf die 2, Force Out.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":129,"y":144},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":170.97,"y":121.1},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":176.21,"y":154.36,"status":"OUT"},{"id":"rb","x":163.4,"y":209.6,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":123.15,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Grounder zum SS — wer deckt die 2');

-- Grounder zum SS — wer deckt die 2 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = '2B dreht und wirft weiter auf die 1 — Doppelspiel, wenn der Batter langsam ist.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":129,"y":144},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":170.97,"y":121.1},{"position":"RF","x":210.01,"y":191.12}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Grounder zum SS — wer deckt die 2');

-- Grounder zum 2B — wer deckt die 2 – Stand 2
UPDATE play_step SET
    duration_ms = 1400,
    note = 'SS zur Base, 2B fängt.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":181,"y":144},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":176.21,"y":154.36,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":177.05,"y":149.78,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Grounder zum 2B — wer deckt die 2');

-- Grounder zum 2B — wer deckt die 2 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Kurzer Wurf auf die 2.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":181,"y":144},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":139.03,"y":121.1},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":176.21,"y":154.36,"status":"OUT"},{"id":"rb","x":163.4,"y":209.6,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":123.15,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Grounder zum 2B — wer deckt die 2');

-- Grounder zum 2B — wer deckt die 2 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Weiter auf die 1.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":181,"y":144},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":139.03,"y":121.1},{"position":"RF","x":210.01,"y":191.12}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Grounder zum 2B — wer deckt die 2');

-- Grounder zum 3B — Wurf auf die 1 – Stand 2
UPDATE play_step SET
    duration_ms = 3000,
    note = '3B greift ihn an der Linie ab.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":111,"y":172},{"position":"LF","x":92.8,"y":172.58},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":117.83,"y":173.55,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Grounder zum 3B — Wurf auf die 1');

-- Grounder zum 3B — Wurf auf die 1 – Stand 3
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Langer Wurf quer rüber, 1B an der Base — der C geht hinter die 1.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":172.82,"y":200.18},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":111,"y":172},{"position":"LF","x":92.8,"y":172.58},{"position":"CF","x":155,"y":33},{"position":"RF","x":217.42,"y":176.08}],"runners":[{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Grounder zum 3B — Wurf auf die 1');

-- Grounder zum 3B — Wurf auf die 1 – Stand 4
UPDATE play_step SET
    duration_ms = 1600,
    note = 'Out an der 1.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":172.82,"y":200.18},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":111,"y":172},{"position":"LF","x":92.8,"y":172.58},{"position":"CF","x":155,"y":33},{"position":"RF","x":217.42,"y":176.08}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Grounder zum 3B — Wurf auf die 1');

-- Grounder zum 1B — wer deckt die 1 – Stand 3
UPDATE play_step SET
    duration_ms = 1600,
    note = 'Wurf zum laufenden Pitcher, er trifft die Base mit dem Fuß.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":204.5,"y":168.5},{"position":"C","x":172.82,"y":200.18},{"position":"1B","x":185,"y":186},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"P","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Grounder zum 1B — wer deckt die 1');

-- Grounder zum 1B — wer deckt die 1 – Stand 4
UPDATE play_step SET
    duration_ms = 1600,
    note = 'Out.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":204.5,"y":168.5},{"position":"C","x":172.82,"y":200.18},{"position":"1B","x":185,"y":186},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"P","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Grounder zum 1B — wer deckt die 1');

-- Comebacker zum Pitcher – Stand 3
UPDATE play_step SET
    duration_ms = 1400,
    note = 'P dreht sich zur 2. Wer dort deckt, ist abgesprochen — hier der 2B.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":174.09,"y":152.24,"status":"ACTIVE"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Comebacker zum Pitcher');

-- Comebacker zum Pitcher – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Wurf auf die 2.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":174.09,"y":152.24,"status":"OUT"},{"id":"rb","x":180.2,"y":192.8,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":123.15,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Comebacker zum Pitcher');

-- Comebacker zum Pitcher – Stand 5
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Und weiter auf die 1.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":210.01,"y":191.12}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 5 AND play_id = (SELECT id FROM play WHERE title = 'Comebacker zum Pitcher');

-- Doppelspiel 6-4-3 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Wurf zur 2, der 2B nimmt im Lauf an.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":121,"y":148},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":171.53,"y":121.88},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":180.46,"y":158.6,"status":"OUT"},{"id":"rb","x":163.4,"y":209.6,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Doppelspiel 6-4-3');

-- Doppelspiel 6-4-3 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Abdrehen vom Runner weg, dann auf die 1.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":121,"y":148},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":171.53,"y":121.88},{"position":"RF","x":211.57,"y":189.72}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Doppelspiel 6-4-3');

-- Single ins LF — Backup hinter der 2 – Stand 3
UPDATE play_step SET
    duration_ms = 2800,
    note = 'Wurf auf die 2: SS nimmt an, der 2B steht dahinter. Der P sichert die 3 ab.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":96.57,"y":187.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":178,"y":141.15},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":131.21,"y":65.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF — Backup hinter der 2');

-- Single ins RF — Backup hinter der 1 – Stand 2
UPDATE play_step SET
    duration_ms = 2800,
    note = 'RF nimmt auf, 1B kommt zurück zur Base.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":210.37,"y":119.33,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF — Backup hinter der 1');

-- Single ins RF — Backup hinter der 1 – Stand 3
UPDATE play_step SET
    duration_ms = 2600,
    note = 'Wurf zurück zur 1, 2B sichert im Foul-Gebiet dahinter ab.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":192.43,"y":192.57},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"1B","x":204.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF — Backup hinter der 1');

-- Bases Loaded — Force an Home – Stand 2
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Grounder zum SS. Alle drei müssen laufen.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":129,"y":146},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":184.7,"y":162.85,"status":"ACTIVE"},{"id":"r2","x":142.27,"y":145.88,"status":"ACTIVE"},{"id":"r3","x":125.3,"y":188.3,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":133.1,"y":151.67,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Bases Loaded — Force an Home');

-- Bases Loaded — Force an Home – Stand 3
UPDATE play_step SET
    duration_ms = 2600,
    note = 'Wurf nach Home — der kürzeste Weg und der teuerste Runner.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":161.27,"y":236.99},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":129,"y":146},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":167.73,"y":145.88,"status":"ACTIVE"},{"id":"r2","x":125.3,"y":162.85,"status":"ACTIVE"},{"id":"r3","x":155,"y":218,"status":"OUT"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":228,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Bases Loaded — Force an Home');

-- Bases Loaded — Force an Home – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Und weiter auf die 1 — Doppelspiel, wenn der Wurf sitzt.',
    outs = 3,
    markers = '{"defenders":[{"position":"P","x":161.27,"y":236.99},{"position":"C","x":155,"y":228},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":177,"y":140},{"position":"SS","x":129,"y":146},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":210.01,"y":160.03}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r2","x":112.57,"y":175.57,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Bases Loaded — Force an Home');

-- Bases Loaded — der 3B tritt selbst auf die 3 – Stand 3
UPDATE play_step SET
    duration_ms = 1800,
    note = 'Er tritt selbst auf die Base — der schnellste Force, ganz ohne Wurf.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":167.73,"y":145.88,"status":"ACTIVE"},{"id":"r2","x":112.57,"y":175.57,"status":"OUT"},{"id":"r3","x":142.27,"y":205.27,"status":"ACTIVE"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Bases Loaded — der 3B tritt selbst auf die 3');

-- Bases Loaded — der 3B tritt selbst auf die 3 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Dann der lange Wurf auf die 1. Der Run von der 3 zählt — zwei Outs sind mehr wert.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":217.43,"y":175.57}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r3","x":142.27,"y":205.27,"status":"SCORED"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Bases Loaded — der 3B tritt selbst auf die 3');

-- Überwurf an der 1 — wer sichert ab – Stand 2
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Der Ball fliegt über den 1B hinweg ins Foul-Gebiet.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":231.43,"y":145.57}],"runners":[{"id":"rb","x":193.18,"y":179.82,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":223.42640687119285,"y":189.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Überwurf an der 1 — wer sichert ab');

-- Überwurf an der 1 — wer sichert ab – Stand 3
UPDATE play_step SET
    duration_ms = 1600,
    note = 'RF war von Anfang an unterwegs — ohne ihn läuft der Runner bis zur 3.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":233.43,"y":179.57}],"runners":[{"id":"rb","x":186.82,"y":164.97,"status":"ACTIVE"}],"ball":{"state":"LOOSE","holder":null,"x":219.42640687119285,"y":185.57359312880715,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Überwurf an der 1 — wer sichert ab');

-- Überwurf an der 1 — wer sichert ab – Stand 4
UPDATE play_step SET
    duration_ms = 2000,
    note = 'RF hat ihn, der Runner bleibt auf der 2.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":233.43,"y":179.57}],"runners":[{"id":"rb","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"RF","x":233.42640687119285,"y":179.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Überwurf an der 1 — wer sichert ab');

-- Single ins LF, Runner auf 1 — Wurf auf die 3 – Stand 3
UPDATE play_step SET
    duration_ms = 2800,
    note = 'SS geht als Cut-Mann auf die Linie LF–3B, der 2B rückt auf die 2, der P hinter die 3.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":102.91,"y":141.75},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":138.03,"y":150.12,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":101.9,"y":134.82,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF, Runner auf 1 — Wurf auf die 3');

-- Single ins LF, Runner auf 1 — Wurf auf die 3 – Stand 4
UPDATE play_step SET
    duration_ms = 1400,
    note = 'Cut lässt durch — der Wurf geht auf die 3.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":117.64,"y":194.92},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":102.91,"y":141.75},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":116.82,"y":171.33,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF, Runner auf 1 — Wurf auf die 3');

-- Single ins CF, Runner auf 1 — Wurf auf die 3 – Stand 3
UPDATE play_step SET
    duration_ms = 2800,
    note = 'SS stellt sich zwischen CF und 3B, der 2B deckt die 2, der P sichert hinter der 3 ab.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":133.79,"y":136.79},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":98},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":133.79,"y":154.36,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":137.68,"y":130.97,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins CF, Runner auf 1 — Wurf auf die 3');

-- Single ins CF, Runner auf 1 — Wurf auf die 3 – Stand 4
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Wurf durch auf die 3.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":133.79,"y":136.79},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":98},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":114.69,"y":173.45,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Single ins CF, Runner auf 1 — Wurf auf die 3');

-- Single ins RF, Runner auf 1 — Wurf auf die 3 – Stand 3
UPDATE play_step SET
    duration_ms = 2800,
    note = 'Ball rechts, also zieht der 2B als Cut heraus. Der SS deckt die 2, der 3B stellt ihn, der P sichert hinter der 3 ab.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":168.91,"y":141.75},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"r1","x":135.91,"y":152.24,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":175.07,"y":138.42,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 1 — Wurf auf die 3');

-- Single ins RF, Runner auf 1 — Wurf auf die 3 – Stand 4
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Der Runner war zu weit raus — Wurf auf die 3.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":168.91,"y":141.75},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"r1","x":135.91,"y":152.24,"status":"OUT"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 1 — Wurf auf die 3');

-- Single ins LF, Runner auf 2 — Wurf nach Home – Stand 3
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Der C stellt den SS auf die Linie LF–Home — Ball links, also er. Der 3B bleibt an der 3, der 2B deckt die 2, der P geht hinter die Platte.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":119,"y":155.65},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":133.79,"y":196.79,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":115.71,"y":149.47,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF, Runner auf 2 — Wurf nach Home');

-- Single ins LF, Runner auf 2 — Wurf nach Home – Stand 4
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Durchlassen, Wurf nach Home.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":164.95,"y":235.35},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":119,"y":155.65},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":150.76,"y":213.76,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":228,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF, Runner auf 2 — Wurf nach Home');

-- Single ins RF, Runner auf 2 — Wurf nach Home – Stand 1
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Dasselbe von rechts — hier ist der 2B der Relay.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 1 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 2 — Wurf nach Home');

-- Single ins RF, Runner auf 2 — Wurf nach Home – Stand 3
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Der C stellt den 2B auf die Linie RF–Home. Der 1B bleibt an der 1, der SS deckt die 2, der P geht hinter die Platte.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":228},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":188,"y":160.84},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"r2","x":135.91,"y":198.91,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":191.32,"y":154.68,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 2 — Wurf nach Home');

-- Single ins RF, Runner auf 2 — Wurf nach Home – Stand 4
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Der Wurf segelt — der Relay nimmt ihn runter. Der Run zählt, der Batter bleibt auf der 1.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":228},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":188,"y":160.84},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"r2","x":135.91,"y":198.91,"status":"SCORED"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":188,"y":160.84,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 2 — Wurf nach Home');

-- Double in die linke Gasse — Relay über SS – Stand 4
UPDATE play_step SET
    duration_ms = 2800,
    note = 'Relay dreht und wirft auf die 3 — der P steht dahinter.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":76.84,"y":123.9},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":41.1,"y":72.22},{"position":"CF","x":107.72,"y":49.28},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Double in die linke Gasse — Relay über SS');

-- Double in die rechte Gasse — Relay über 2B – Stand 4
UPDATE play_step SET
    duration_ms = 2000,
    note = 'Wurf auf die 2 — SS deckt ab, weil der 2B draußen ist.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":137.33,"y":142.53},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":211.95,"y":102.68},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":202.28,"y":49.28},{"position":"RF","x":268.9,"y":72.22}],"runners":[{"id":"rb","x":157.12,"y":135.27,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Double in die rechte Gasse — Relay über 2B');

-- Tiefes RF, Doppel-Relay – Stand 3
UPDATE play_step SET
    duration_ms = 2600,
    note = '2B geht als Relay raus — der SS deckt die 2, da will der Batter hin.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":225.71,"y":133.73},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":283.56,"y":64.79}],"runners":[{"id":"r1","x":129.54,"y":158.6,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":230.15,"y":128.32,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Tiefes RF, Doppel-Relay');

-- Tiefes RF, Doppel-Relay – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Der Relay wirft nach Home, der P geht hinter die Platte.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":225.71,"y":133.73},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":283.56,"y":64.79}],"runners":[{"id":"r1","x":133.79,"y":196.79,"status":"ACTIVE"},{"id":"rb","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":183.28,"y":184.29,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Tiefes RF, Doppel-Relay');

-- Tiefes RF, Doppel-Relay – Stand 5
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Von dort nach Home. Der Run fällt trotzdem — dafür bleibt der Batter auf der 2.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":142.15,"y":233.32},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":225.71,"y":133.73},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":283.56,"y":64.79}],"runners":[{"id":"r1","x":133.79,"y":196.79,"status":"SCORED"},{"id":"rb","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 5 AND play_id = (SELECT id FROM play WHERE title = 'Tiefes RF, Doppel-Relay');

-- Sac-Bunt, Runner auf 1 — sicherer Out an der 1 – Stand 2
UPDATE play_step SET
    duration_ms = 2000,
    note = 'P und 3B stürmen vor, 1B kommt von rechts.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":201},{"position":"C","x":155,"y":226},{"position":"1B","x":173.92,"y":190.67},{"position":"2B","x":204.5,"y":168.5},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":136.08,"y":190.67},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":184.7,"y":162.85,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"LOOSE","holder":null,"x":147,"y":204,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Sac-Bunt, Runner auf 1 — sicherer Out an der 1');

-- Sac-Bunt, Runner auf 1 — sicherer Out an der 1 – Stand 3
UPDATE play_step SET
    duration_ms = 1200,
    note = 'P nimmt den Ball auf — er ist am nächsten dran.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":147,"y":204},{"position":"C","x":155,"y":226},{"position":"1B","x":173.92,"y":190.67},{"position":"2B","x":204.5,"y":168.5},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":136.08,"y":190.67},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":171.97,"y":150.12,"status":"ACTIVE"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"P","x":147,"y":204,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Sac-Bunt, Runner auf 1 — sicherer Out an der 1');

-- Sac-Bunt, Runner auf 1 — sicherer Out an der 1 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Sicherer Wurf auf die 1 — der 2B deckt dort ab, weil der 1B vorne ist.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":147,"y":204},{"position":"C","x":155,"y":226},{"position":"1B","x":173.92,"y":190.67},{"position":"2B","x":204.5,"y":168.5},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":136.08,"y":190.67},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":214.85,"y":165.75}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"2B","x":204.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Sac-Bunt, Runner auf 1 — sicherer Out an der 1');

-- Sac-Bunt, Runner auf 1 — Wurf auf die 2 – Stand 1
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Derselbe Bunt, andere Frage: kriegen wir den vorderen Runner überhaupt?',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 1 AND play_id = (SELECT id FROM play WHERE title = 'Sac-Bunt, Runner auf 1 — Wurf auf die 2');

-- Sac-Bunt, Runner auf 1 — Wurf auf die 2 – Stand 2
UPDATE play_step SET
    duration_ms = 1600,
    note = 'Bunt rollt hart genug zum 3B — der 1B bleibt an seiner Base.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":195},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":138.35,"y":193.95},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":184.7,"y":162.85,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"LOOSE","holder":null,"x":139,"y":200,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Sac-Bunt, Runner auf 1 — Wurf auf die 2');

-- Sac-Bunt, Runner auf 1 — Wurf auf die 2 – Stand 3
UPDATE play_step SET
    duration_ms = 1200,
    note = '3B nimmt auf und schaut zur 2 — der Runner ist zu weit.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":195},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":139,"y":200},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":165.61,"y":143.75,"status":"ACTIVE"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":139,"y":200,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Sac-Bunt, Runner auf 1 — Wurf auf die 2');

-- Sac-Bunt, Runner auf 1 — Wurf auf die 2 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Also an die 1. Der Runner bekommt die 2, wir bekommen den sicheren Out.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":195},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":139,"y":200},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215.88,"y":167.86}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":191,"y":166,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Sac-Bunt, Runner auf 1 — Wurf auf die 2');

-- Bunt Richtung 3B, Runner auf 2 — SS deckt die 3 – Stand 2
UPDATE play_step SET
    duration_ms = 2000,
    note = '3B muss vor — damit ist die 3 offen. Der 1B bleibt an seiner Base.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":193},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":105.5,"y":168.5},{"position":"3B","x":139.49,"y":195.6},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":140.15,"y":148,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"LOOSE","holder":null,"x":137,"y":202,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Bunt Richtung 3B, Runner auf 2 — SS deckt die 3');

-- Bunt Richtung 3B, Runner auf 2 — SS deckt die 3 – Stand 3
UPDATE play_step SET
    duration_ms = 1200,
    note = 'SS füllt die Lücke an der 3. Ohne ihn läuft der Runner einfach durch.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":193},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":105.5,"y":168.5},{"position":"3B","x":137,"y":202},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":125.3,"y":162.85,"status":"ACTIVE"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":137,"y":202,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Bunt Richtung 3B, Runner auf 2 — SS deckt die 3');

-- Bunt Richtung 3B, Runner auf 2 — SS deckt die 3 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Wurf an die 1 — der 1B fängt, schaut zur 3 und ist bereit zu werfen.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":193},{"position":"C","x":155,"y":226},{"position":"1B","x":191.43,"y":177.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":105.5,"y":168.5},{"position":"3B","x":137,"y":202},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215.75,"y":167.56}],"runners":[{"id":"r2","x":112.57,"y":175.57,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":191.42640687119285,"y":177.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Bunt Richtung 3B, Runner auf 2 — SS deckt die 3');

-- Runner auf 1 und 2 — Wheel Play – Stand 2
UPDATE play_step SET
    duration_ms = 2000,
    note = '3B stürmt, SS rotiert zur 3, 2B zur 1.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":195},{"position":"C","x":155,"y":226},{"position":"1B","x":173.92,"y":190.67},{"position":"2B","x":204.5,"y":168.5},{"position":"SS","x":105.5,"y":168.5},{"position":"3B","x":140.63,"y":197.24},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":184.7,"y":162.85,"status":"ACTIVE"},{"id":"r2","x":142.27,"y":145.88,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"LOOSE","holder":null,"x":135,"y":200,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Runner auf 1 und 2 — Wheel Play');

-- Runner auf 1 und 2 — Wheel Play – Stand 3
UPDATE play_step SET
    duration_ms = 1800,
    note = '3B nimmt auf — der Führungs-Runner ist längst unterwegs, die 3 ist kein Ziel.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":195},{"position":"C","x":155,"y":226},{"position":"1B","x":173.92,"y":190.67},{"position":"2B","x":204.5,"y":168.5},{"position":"SS","x":105.5,"y":168.5},{"position":"3B","x":135,"y":200},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":167.73,"y":145.88,"status":"ACTIVE"},{"id":"r2","x":112.57,"y":175.57,"status":"ACTIVE"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":135,"y":200,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Runner auf 1 und 2 — Wheel Play');

-- Runner auf 1 und 2 — Wheel Play – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Also der sichere Out an der 1 — der 2B deckt, weil der 1B vorne ist.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":195},{"position":"C","x":155,"y":226},{"position":"1B","x":173.92,"y":190.67},{"position":"2B","x":204.5,"y":168.5},{"position":"SS","x":105.5,"y":168.5},{"position":"3B","x":135,"y":200},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":216.05,"y":168.29}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r2","x":112.57,"y":175.57,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"2B","x":204.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Runner auf 1 und 2 — Wheel Play');

-- Squeeze, Runner auf 3 – Stand 2
UPDATE play_step SET
    duration_ms = 1400,
    note = 'Runner läuft los, der Bunt geht vor Home.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":199},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":133.79,"y":196.79,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"LOOSE","holder":null,"x":161,"y":208,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Squeeze, Runner auf 3');

-- Squeeze, Runner auf 3 – Stand 3
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Der P nimmt den Ball — der C bleibt an der Platte, sonst deckt sie niemand.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":161,"y":208},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":146.51,"y":209.51,"status":"ACTIVE"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"P","x":161,"y":208,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Squeeze, Runner auf 3');

-- Squeeze, Runner auf 3 – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Kurzer Wurf zum Catcher, Tag — nur wenn der Ball früh genug da ist.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":161,"y":208},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":146.51,"y":209.51,"status":"OUT"},{"id":"rb","x":180.2,"y":192.8,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":228,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Squeeze, Runner auf 3');

-- Squeeze, Runner auf 3 – Stand 5 (neu)
INSERT INTO play_step (play_id, ordinal, duration_ms, note, outs, markers)
SELECT id, 5, 3000, 'Und wenn es passt, weiter an die 1 — der Batter läuft ja noch.', 3, '{"defenders":[{"position":"P","x":161,"y":208},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":210.01,"y":160.03}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":191,"y":166,"trajectory":"AIR"}}'::jsonb
FROM play WHERE title = 'Squeeze, Runner auf 3'
  AND NOT EXISTS (SELECT 1 FROM play_step s WHERE s.play_id = play.id AND s.ordinal = 5);

-- Bunt direkt vor Home — Catcher übernimmt – Stand 1
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Wer den Bunt nimmt, entscheidet die Richtung: links der 3B, Mitte der P — und direkt vor der Platte der C.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[],"ball":{"state":"AT_BAT","holder":null,"x":155,"y":216,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 1 AND play_id = (SELECT id FROM play WHERE title = 'Bunt direkt vor Home — Catcher übernimmt');

-- Bunt direkt vor Home — Catcher übernimmt – Stand 2
UPDATE play_step SET
    duration_ms = 1200,
    note = 'P stürmt, bleibt aber stehen: der Ball gehört dem Catcher.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":141,"y":198},{"position":"C","x":155,"y":212},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"LOOSE","holder":null,"x":155,"y":210,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Bunt direkt vor Home — Catcher übernimmt');

-- Bunt direkt vor Home — Catcher übernimmt – Stand 3
UPDATE play_step SET
    duration_ms = 1200,
    note = 'C hat freie Sicht auf die 1 — der P ist aus der Wurflinie gegangen.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":141,"y":198},{"position":"C","x":155,"y":212},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":212,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Bunt direkt vor Home — Catcher übernimmt');

-- Bunt direkt vor Home — Catcher übernimmt – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Wurf an die 1, der 1B fängt.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":141,"y":198},{"position":"C","x":155,"y":212},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":212.6,"y":162.55}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":191,"y":166,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Bunt direkt vor Home — Catcher übernimmt');

-- Wurf auf die 2, Runner auf 3 startet – Stand 1
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Runner auf 1 und 3. Der auf 1 läuft — und will genau das.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 1 AND play_id = (SELECT id FROM play WHERE title = 'Wurf auf die 2, Runner auf 3 startet');

-- Wurf auf die 2, Runner auf 3 startet – Stand 2
UPDATE play_step SET
    duration_ms = 1600,
    note = 'C wirft auf die 2, der Runner von der 3 startet sofort.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":171.97,"y":150.12,"status":"ACTIVE"},{"id":"r3","x":127.42,"y":190.42,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":167.09,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Wurf auf die 2, Runner auf 3 startet');

-- Wurf auf die 2, Runner auf 3 startet – Stand 3
UPDATE play_step SET
    duration_ms = 3000,
    note = 'SS fängt und wirft sofort zurück nach Home.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":161.36,"y":139.51,"status":"ACTIVE"},{"id":"r3","x":138.03,"y":201.03,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":123.15,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Wurf auf die 2, Runner auf 3 startet');

-- Wurf auf die 2, Runner auf 3 startet – Stand 4
UPDATE play_step SET
    duration_ms = 2600,
    note = 'Zurück zur Platte — der Run ist wichtiger als der Out an der 2.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":238},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r3","x":138.03,"y":201.03,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":228,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Wurf auf die 2, Runner auf 3 startet');

-- Catcher wirft an den Pitcher — Abfangen in der Mitte – Stand 1
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Dieselbe Lage, knapper Spielstand. Der Ball ist beim Catcher.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 1 AND play_id = (SELECT id FROM play WHERE title = 'Catcher wirft an den Pitcher — Abfangen in der Mitte');

-- Catcher wirft an den Pitcher — Abfangen in der Mitte – Stand 2
UPDATE play_step SET
    duration_ms = 1400,
    note = 'C wirft scheinbar zur 2 — der P fängt den Ball ab.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":169},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":176.21,"y":154.36,"status":"ACTIVE"},{"id":"r3","x":125.3,"y":188.3,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"P","x":155,"y":169,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Catcher wirft an den Pitcher — Abfangen in der Mitte');

-- Catcher wirft an den Pitcher — Abfangen in der Mitte – Stand 3
UPDATE play_step SET
    duration_ms = 1200,
    note = 'P dreht sich zum Runner auf 3. Der muss zurück.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":169},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":163.49,"y":141.63,"status":"ACTIVE"},{"id":"r3","x":118.94,"y":181.94,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"P","x":155,"y":169,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Catcher wirft an den Pitcher — Abfangen in der Mitte');

-- Catcher wirft an den Pitcher — Abfangen in der Mitte – Stand 4
UPDATE play_step SET
    duration_ms = 2000,
    note = 'Der Runner auf 1 bekommt die 2 geschenkt — der Run zählt mehr.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":169},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"P","x":155,"y":169,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Catcher wirft an den Pitcher — Abfangen in der Mitte');

-- Angetäuschter Wurf auf die 2 – Stand 2
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Arm hoch, Ball bleibt in der Hand.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":178.33,"y":156.48,"status":"ACTIVE"},{"id":"r3","x":125.3,"y":188.3,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Angetäuschter Wurf auf die 2');

-- Angetäuschter Wurf auf die 2 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Der Runner auf 3 ist zu weit raus.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":178.33,"y":156.48,"status":"ACTIVE"},{"id":"r3","x":127.42,"y":190.42,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Angetäuschter Wurf auf die 2');

-- Angetäuschter Wurf auf die 2 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Wurf auf die 3 — Tag-Out, wenn er nicht zurückkommt.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":98.43,"y":161.43},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":178.33,"y":156.48,"status":"ACTIVE"},{"id":"r3","x":127.42,"y":190.42,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Angetäuschter Wurf auf die 2');

-- Direkter Wurf auf die 3 – Stand 2
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Der C hat den Ball, der Runner auf 3 nimmt zu viel Abstand.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r3","x":123.18,"y":186.18,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Direkter Wurf auf die 3');

-- Direkter Wurf auf die 3 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Schneller Wurf auf die 3 — vom Catcher, nicht vom Pitcher.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":98.43,"y":161.43},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r3","x":118.94,"y":181.94,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Direkter Wurf auf die 3');

-- Direkter Wurf auf die 3 – Stand 4
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Tag — Inning vorbei.',
    outs = 3,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":98.43,"y":161.43},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r3","x":118.94,"y":181.94,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Direkter Wurf auf die 3');

-- Rundown zwischen Home und 1 – Stand 2
UPDATE play_step SET
    duration_ms = 1200,
    note = '1B hat den Ball und läuft ihn an — nicht werfen, laufen.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":186.82,"y":186.18},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":169.85,"y":203.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"1B","x":186.82,"y":186.18,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen Home und 1');

-- Rundown zwischen Home und 1 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Erst wenn der Runner festgelegt ist: ein Wurf zum Catcher.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":140.86,"y":232.14},{"position":"C","x":155,"y":228},{"position":"1B","x":186.82,"y":186.18},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":163.49,"y":209.51,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":228,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen Home und 1');

-- Rundown zwischen Home und 1 – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Tag. Ein Wurf reicht, wenn man ihn richtig anläuft.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":140.86,"y":232.14},{"position":"C","x":155,"y":228},{"position":"1B","x":186.82,"y":186.18},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":163.49,"y":209.51,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":228,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen Home und 1');

-- Rundown zwischen 1 und 2 – Stand 2
UPDATE play_step SET
    duration_ms = 1400,
    note = '2B läuft ihn Richtung 1 zurück.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":167.73,"y":145.88},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":182.58,"y":160.72,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":167.73,"y":145.88,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen 1 und 2');

-- Rundown zwischen 1 und 2 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Wurf zum 1B, sobald der Runner festgelegt ist.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":167.73,"y":145.88},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":211.57,"y":189.72}],"runners":[{"id":"r1","x":191.06,"y":169.21,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"1B","x":204.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen 1 und 2');

-- Rundown zwischen 1 und 2 – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Tag an der 1.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":167.73,"y":145.88},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":211.57,"y":189.72}],"runners":[{"id":"r1","x":191.06,"y":169.21,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":204.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen 1 und 2');

-- Rundown zwischen 2 und 3 – Stand 2
UPDATE play_step SET
    duration_ms = 1400,
    note = 'SS treibt ihn zurück zur 2.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":125.3,"y":162.85},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":142.27,"y":145.88,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":125.3,"y":162.85,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen 2 und 3');

-- Rundown zwischen 2 und 3 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Wurf zum 2B an der Base.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":125.3,"y":162.85},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":169.14,"y":119},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":149.91,"y":138.24,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":123.15,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen 2 und 3');

-- Rundown zwischen 2 und 3 – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Tag.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":125.3,"y":162.85},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":169.14,"y":119},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":149.91,"y":138.24,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":123.15,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen 2 und 3');

-- Rundown zwischen 3 und Home – Stand 2
UPDATE play_step SET
    duration_ms = 2200,
    note = 'C läuft ihn zur 3 zurück. Der Runner darf nicht nach Home.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":228},{"position":"C","x":142.27,"y":205.27},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":125.3,"y":188.3,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":142.27,"y":205.27,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen 3 und Home');

-- Rundown zwischen 3 und Home – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Wurf zum 3B.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":228},{"position":"C","x":142.27,"y":205.27},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":98.43,"y":161.43},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":117.66,"y":180.66,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen 3 und Home');

-- Rundown zwischen 3 und Home – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Tag an der 3. P ist nachgerückt, falls der Wurf danebengeht.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":228},{"position":"C","x":142.27,"y":205.27},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":98.43,"y":161.43},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":117.66,"y":180.66,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen 3 und Home');

-- Infield Fly — Lage und Verhalten – Stand 2
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Hoher Ball über dem Infield — der Umpire ruft.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":149,"y":143.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":149,"y":135.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Infield Fly — Lage und Verhalten');

-- Infield Fly — Lage und Verhalten – Stand 3
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Der Batter ist raus, egal ob gefangen wird. Die Runner bleiben stehen.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":149,"y":143.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"},{"id":"rb","x":155,"y":218,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"SS","x":149,"y":143.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Infield Fly — Lage und Verhalten');

-- Infield Fly — Lage und Verhalten – Stand 4
UPDATE play_step SET
    duration_ms = 2000,
    note = 'Alternative: Fällt der Ball — trotzdem Out, und die Runner müssen nicht laufen.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":149,"y":143.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":149,"y":143.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Infield Fly — Lage und Verhalten');

-- Steal auf die 2 — Wurf und Abdeckung – Stand 2
UPDATE play_step SET
    duration_ms = 1400,
    note = 'C steht auf, SS geht zur Base. Wer deckt, ist vorher abgesprochen.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":180.46,"y":158.6,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Steal auf die 2 — Wurf und Abdeckung');

-- Steal auf die 2 — Wurf und Abdeckung – Stand 3
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Wurf auf die 2.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":165.61,"y":143.75,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":155,"y":158.6,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Steal auf die 2 — Wurf und Abdeckung');

-- Steal auf die 2 — Wurf und Abdeckung – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'SS fängt und tagt.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":165.61,"y":143.75,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":123.15,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Steal auf die 2 — Wurf und Abdeckung');

-- Steal auf die 3 — Wurf und Abdeckung – Stand 2
UPDATE play_step SET
    duration_ms = 3000,
    note = '3B zur Base, SS und LF sichern hinter der 3 ab.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":96.57,"y":163.57},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":78.57,"y":145.57},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":138.03,"y":150.12,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Steal auf die 3 — Wurf und Abdeckung');

-- Steal auf die 3 — Wurf und Abdeckung – Stand 3
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Wurf die Linie entlang — am Runner vorbei.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":96.57,"y":163.57},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":78.57,"y":145.57},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":121.06,"y":167.09,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":125.3,"y":188.3,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Steal auf die 3 — Wurf und Abdeckung');

-- Steal auf die 3 — Wurf und Abdeckung – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = '3B tagt.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":96.57,"y":163.57},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":78.57,"y":145.57},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":121.06,"y":167.09,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Steal auf die 3 — Wurf und Abdeckung');

-- Doppel-Steal, Runner auf 1 und 2 – Stand 2
UPDATE play_step SET
    duration_ms = 1400,
    note = 'Der Führungs-Runner geht auf die 3.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":180.46,"y":158.6,"status":"ACTIVE"},{"id":"r2","x":138.03,"y":150.12,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Doppel-Steal, Runner auf 1 und 2');

-- Doppel-Steal, Runner auf 1 und 2 – Stand 3
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Wurf auf die 3 — der vordere Runner zählt mehr.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":163.49,"y":141.63,"status":"ACTIVE"},{"id":"r2","x":121.06,"y":167.09,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":125.3,"y":188.3,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Doppel-Steal, Runner auf 1 und 2');

-- Doppel-Steal, Runner auf 1 und 2 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Out an der 3, die 2 schenken wir her.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":98.43,"y":161.43},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r2","x":121.06,"y":167.09,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Doppel-Steal, Runner auf 1 und 2');

-- Pickoff an der 1 – Stand 2
UPDATE play_step SET
    duration_ms = 1200,
    note = 'C hat den Ball und wirft sofort zur 1.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":189.65,"y":167.8,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Pickoff an der 1');

-- Pickoff an der 1 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = '1B fängt an der Base.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":211.57,"y":161.43}],"runners":[{"id":"r1","x":189.65,"y":167.8,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"1B","x":204.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Pickoff an der 1');

-- Pickoff an der 1 – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Tag, bevor der Runner zurück ist.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":211.57,"y":161.43}],"runners":[{"id":"r1","x":189.65,"y":167.8,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":204.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Pickoff an der 1');

-- Pickoff an der 2 – Stand 2
UPDATE play_step SET
    duration_ms = 1200,
    note = 'SS schleicht hinter dem Runner zur Base.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":145,"y":129.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":147.22,"y":140.93,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Pickoff an der 2');

-- Pickoff an der 2 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Wurf, SS ist genau rechtzeitig da.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":147.22,"y":140.93,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Pickoff an der 2');

-- Pickoff an der 2 – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Tag. Timing ist alles — zu früh und der Runner sieht ihn kommen.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":123.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":147.22,"y":140.93,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Pickoff an der 2');

-- Pickoff an der 3 – Stand 2
UPDATE play_step SET
    duration_ms = 1200,
    note = '3B geht zurück zur Base, sobald der Wurf durch ist.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":120.35,"y":183.35,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Pickoff an der 3');

-- Pickoff an der 3 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Schneller Wurf.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":98.43,"y":161.43},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":120.35,"y":183.35,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Pickoff an der 3');

-- Pickoff an der 3 – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Tag. Geht der Wurf daneben, fällt der Run — nur bei sicherem Vorsprung.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":105.5,"y":168.5},{"position":"LF","x":98.43,"y":161.43},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":120.35,"y":183.35,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"3B","x":105.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Pickoff an der 3');

-- Delayed Steal – Stand 1
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Der Runner läuft nicht mit dem Wurf, sondern erst, wenn der C zurückwirft.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 1 AND play_id = (SELECT id FROM play WHERE title = 'Delayed Steal');

-- Delayed Steal – Stand 2
UPDATE play_step SET
    duration_ms = 1200,
    note = 'C wirft lässig zum Pitcher zurück — genau da startet der Runner.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":184.7,"y":162.85,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"P","x":155,"y":182,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 2 AND play_id = (SELECT id FROM play WHERE title = 'Delayed Steal');

-- Delayed Steal – Stand 3
UPDATE play_step SET
    duration_ms = 3000,
    note = 'P sieht es und wirft zur 2, der 2B deckt.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":163.49,"y":141.63,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Delayed Steal');

-- Delayed Steal – Stand 4
UPDATE play_step SET
    duration_ms = 2000,
    note = 'Knapp. Dagegen hilft nur: nach jedem Wurf hinschauen.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Delayed Steal');

-- Infield In, Runner auf 3 – Stand 4
UPDATE play_step SET
    duration_ms = 2600,
    note = 'SS nimmt auf und wirft zum Catcher.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":161.61,"y":236.88},{"position":"C","x":155,"y":228},{"position":"1B","x":191.43,"y":185.57},{"position":"2B","x":175,"y":158},{"position":"SS","x":141,"y":178},{"position":"3B","x":118.57,"y":185.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":129.54,"y":192.54,"status":"OUT"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Infield In, Runner auf 3');

-- Ball am Zaun — Relay-Kette – Stand 3
UPDATE play_step SET
    duration_ms = 2600,
    note = '2B deckt die 2 — dorthin geht der Wurf, und der P sichert ab.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":169.75,"y":70.6},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":184.5,"y":8.06},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":129.54,"y":158.6,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":169.75,"y":70.6,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Ball am Zaun — Relay-Kette');

-- Ball am Zaun — Relay-Kette – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'SS wirft zum 2B, nicht quer übers halbe Feld — und der P geht hinter die Platte.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":169.75,"y":70.6},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":184.5,"y":8.06},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":133.79,"y":196.79,"status":"ACTIVE"},{"id":"rb","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":123.15,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Ball am Zaun — Relay-Kette');

-- Ball am Zaun — Relay-Kette – Stand 5
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Von dort nach Home. Der Run fällt — wichtig ist, dass der Batter auf der 2 bleibt.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":238},{"position":"C","x":155,"y":228},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":123.15},{"position":"SS","x":169.75,"y":70.6},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":184.5,"y":8.06},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":133.79,"y":196.79,"status":"SCORED"},{"id":"rb","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":228,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 5 AND play_id = (SELECT id FROM play WHERE title = 'Ball am Zaun — Relay-Kette');

-- Runner auf 2 und 3 — anschauen, dann werfen – Stand 3
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Anschauen. Erst wenn er steht, geht der Wurf — sonst läuft er los.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":177,"y":140},{"position":"SS","x":129,"y":146},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":147.93,"y":140.22,"status":"ACTIVE"},{"id":"r3","x":116.82,"y":179.82,"status":"ACTIVE"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":133.1,"y":151.67,"trajectory":"GROUND"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Runner auf 2 und 3 — anschauen, dann werfen');

-- Runner auf 2 und 3 — anschauen, dann werfen – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Out an der 1, der Run fällt nicht. Dafür bleiben beide, wo sie sind.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":204.5,"y":168.5},{"position":"2B","x":177,"y":140},{"position":"SS","x":129,"y":146},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":216.17,"y":182.54}],"runners":[{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":204.5,"y":168.5,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Runner auf 2 und 3 — anschauen, dann werfen');

-- Passed Ball, Runner auf 3 – Stand 3
UPDATE play_step SET
    duration_ms = 1200,
    note = 'P deckt die Platte ab — das ist seine Aufgabe, nicht die des 1B.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":228},{"position":"C","x":145,"y":240},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":144.39,"y":207.39,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":145,"y":240,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Passed Ball, Runner auf 3');

-- Passed Ball, Runner auf 3 – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Wurf zum Pitcher an der Platte, Tag.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":228},{"position":"C","x":145,"y":240},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":144.39,"y":207.39,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"P","x":155,"y":228,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Passed Ball, Runner auf 3');
