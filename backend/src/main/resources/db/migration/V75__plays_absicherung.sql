-- Korrektur der Start-Plays. Erzeugt von scripts/build-seed-plays.mjs --seit <migration>.
--
-- Eine schon angewandte Migration wird NICHT geaendert: das waere eine Pruefsummen-
-- Kollision, Flyway braeche ab und das Backend startete nicht mehr.

-- Grounder zum SS — wer deckt die 2 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Wurf auf die 2, Force Out.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":129,"y":144},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":170.97,"y":121.1},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":176.21,"y":154.36,"status":"OUT"},{"id":"rb","x":163.4,"y":209.6,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Grounder zum SS — wer deckt die 2');

-- Grounder zum SS — wer deckt die 2 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = '2B dreht und wirft weiter auf die 1 — Doppelspiel, wenn der Batter langsam ist.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":129,"y":144},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":170.97,"y":121.1},{"position":"RF","x":211.57,"y":189.72}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Grounder zum SS — wer deckt die 2');

-- Grounder zum 2B — wer deckt die 2 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Kurzer Wurf auf die 2.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":181,"y":144},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":139.03,"y":121.1},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":176.21,"y":154.36,"status":"OUT"},{"id":"rb","x":163.4,"y":209.6,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Grounder zum 2B — wer deckt die 2');

-- Grounder zum 2B — wer deckt die 2 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Weiter auf die 1.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":181,"y":144},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":139.03,"y":121.1},{"position":"RF","x":211.57,"y":189.72}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
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
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":172.82,"y":200.18},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":111,"y":172},{"position":"LF","x":92.8,"y":172.58},{"position":"CF","x":155,"y":33},{"position":"RF","x":217.42,"y":176.08}],"runners":[{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Grounder zum 3B — Wurf auf die 1');

-- Grounder zum 3B — Wurf auf die 1 – Stand 4
UPDATE play_step SET
    duration_ms = 1600,
    note = 'Out an der 1.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":172.82,"y":200.18},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":111,"y":172},{"position":"LF","x":92.8,"y":172.58},{"position":"CF","x":155,"y":33},{"position":"RF","x":217.42,"y":176.08}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Grounder zum 3B — Wurf auf die 1');

-- Comebacker zum Pitcher – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Wurf auf die 2.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":174.09,"y":152.24,"status":"OUT"},{"id":"rb","x":180.2,"y":192.8,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Comebacker zum Pitcher');

-- Comebacker zum Pitcher – Stand 5
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Und weiter auf die 1.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":211.57,"y":189.72}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 5 AND play_id = (SELECT id FROM play WHERE title = 'Comebacker zum Pitcher');

-- Doppelspiel 6-4-3 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Wurf zur 2, der 2B nimmt im Lauf an.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":121,"y":148},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":171.53,"y":121.88},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":180.46,"y":158.6,"status":"OUT"},{"id":"rb","x":163.4,"y":209.6,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Doppelspiel 6-4-3');

-- Doppelspiel 6-4-3 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Abdrehen vom Runner weg, dann auf die 1.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":121,"y":148},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":171.53,"y":121.88},{"position":"RF","x":211.57,"y":189.72}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Doppelspiel 6-4-3');

-- Bases Loaded — Force an Home – Stand 3
UPDATE play_step SET
    duration_ms = 2600,
    note = 'Wurf nach Home — der kürzeste Weg und der teuerste Runner.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":161.27,"y":236.99},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":129,"y":146},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":167.73,"y":145.88,"status":"ACTIVE"},{"id":"r2","x":125.3,"y":162.85,"status":"ACTIVE"},{"id":"r3","x":155,"y":218,"status":"OUT"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Bases Loaded — Force an Home');

-- Bases Loaded — Force an Home – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Und weiter auf die 1 — Doppelspiel, wenn der Wurf sitzt.',
    outs = 3,
    markers = '{"defenders":[{"position":"P","x":161.27,"y":236.99},{"position":"C","x":155,"y":218},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":129,"y":146},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":211.57,"y":161.43}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r2","x":112.57,"y":175.57,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Bases Loaded — Force an Home');

-- Bases Loaded — der 3B tritt selbst auf die 3 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Dann der lange Wurf auf die 1. Der Run von der 3 zählt — zwei Outs sind mehr wert.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":217.43,"y":175.57}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r3","x":142.27,"y":205.27,"status":"SCORED"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Bases Loaded — der 3B tritt selbst auf die 3');

-- Single ins LF, Runner auf 1 — Wurf auf die 3 – Stand 4
UPDATE play_step SET
    duration_ms = 1400,
    note = 'Cut lässt durch — der Wurf geht auf die 3.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":117.64,"y":194.92},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":102.91,"y":141.75},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":116.82,"y":171.33,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF, Runner auf 1 — Wurf auf die 3');

-- Single ins RF, Runner auf 1 — Wurf auf die 3 – Stand 3
UPDATE play_step SET
    duration_ms = 2800,
    note = 'Ball rechts, also zieht der 2B als Cut heraus. Der SS deckt die 2, der 3B stellt ihn, der P sichert hinter der 3 ab.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":168.91,"y":141.75},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"r1","x":135.91,"y":152.24,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":175.07,"y":138.42,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 1 — Wurf auf die 3');

-- Single ins RF, Runner auf 1 — Wurf auf die 3 – Stand 4
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Der Runner war zu weit raus — Wurf auf die 3.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":96.57,"y":189.57},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":168.91,"y":141.75},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"r1","x":135.91,"y":152.24,"status":"OUT"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 1 — Wurf auf die 3');

-- Single ins LF, Runner auf 2 — Wurf nach Home – Stand 3
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Der C stellt den SS auf die Linie LF–Home — Ball links, also er. Der 3B bleibt an der 3, der 2B deckt die 2, der P geht hinter die Platte.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":119,"y":155.65},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":133.79,"y":196.79,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":115.71,"y":149.47,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins LF, Runner auf 2 — Wurf nach Home');

-- Single ins LF, Runner auf 2 — Wurf nach Home – Stand 4
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Durchlassen, Wurf nach Home.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":164.95,"y":235.35},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":119,"y":155.65},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":150.76,"y":213.76,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
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
    markers = '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":218},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":188,"y":160.84},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"r2","x":135.91,"y":198.91,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_FLIGHT","holder":null,"x":191.32,"y":154.68,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 2 — Wurf nach Home');

-- Single ins RF, Runner auf 2 — Wurf nach Home – Stand 4
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Der Wurf segelt — der Relay nimmt ihn runter. Der Run zählt, der Batter bleibt auf der 1.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":218},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":188,"y":160.84},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215,"y":114.08}],"runners":[{"id":"r2","x":135.91,"y":198.91,"status":"SCORED"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":188,"y":160.84,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Single ins RF, Runner auf 2 — Wurf nach Home');

-- Double in die rechte Gasse — Relay über 2B – Stand 4
UPDATE play_step SET
    duration_ms = 2000,
    note = 'Wurf auf die 2 — SS deckt ab, weil der 2B draußen ist.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":137.33,"y":142.53},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":211.95,"y":102.68},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":202.28,"y":49.28},{"position":"RF","x":268.9,"y":72.22}],"runners":[{"id":"rb","x":157.12,"y":135.27,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Double in die rechte Gasse — Relay über 2B');

-- Tiefes RF, Doppel-Relay – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Erster Relay wirft zum zweiten, P geht hinter die Platte.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":226},{"position":"1B","x":193.57,"y":172.04},{"position":"2B","x":186.04,"y":192.02},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":283.56,"y":64.79}],"runners":[{"id":"r1","x":133.79,"y":196.79,"status":"ACTIVE"},{"id":"rb","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"1B","x":193.57,"y":172.04,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Tiefes RF, Doppel-Relay');

-- Tiefes RF, Doppel-Relay – Stand 5
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Von dort nach Home. Der Run fällt trotzdem — dafür bleibt der Batter auf der 2.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":142.14,"y":233.32},{"position":"C","x":155,"y":218},{"position":"1B","x":193.57,"y":172.04},{"position":"2B","x":186.04,"y":192.02},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":283.56,"y":64.79}],"runners":[{"id":"r1","x":133.79,"y":196.79,"status":"SCORED"},{"id":"rb","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 5 AND play_id = (SELECT id FROM play WHERE title = 'Tiefes RF, Doppel-Relay');

-- Sac-Bunt, Runner auf 1 — sicherer Out an der 1 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Sicherer Wurf auf die 1 — der 2B deckt dort ab, weil der 1B vorne ist.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":147,"y":204},{"position":"C","x":155,"y":226},{"position":"1B","x":173.92,"y":190.67},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":136.08,"y":190.67},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":214.85,"y":165.75}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"2B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Sac-Bunt, Runner auf 1 — sicherer Out an der 1');

-- Sac-Bunt, Runner auf 1 — Wurf auf die 2 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Wurf auf die 2 — SS deckt ab. Nur machen, wenn der Ball schnell in der Hand ist.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":195},{"position":"C","x":155,"y":226},{"position":"1B","x":175.06,"y":189.02},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":139,"y":200},{"position":"LF","x":65,"y":62},{"position":"CF","x":159.66,"y":113.7},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":171.97,"y":150.12,"status":"OUT"},{"id":"rb","x":188.6,"y":184.4,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Sac-Bunt, Runner auf 1 — Wurf auf die 2');

-- Bunt Richtung 3B, Runner auf 2 — SS deckt die 3 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Wurf auf die 1 — der 2B deckt, weil der 1B vorne ist. Der Runner bekommt die 3.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":193},{"position":"C","x":155,"y":226},{"position":"1B","x":175.06,"y":189.02},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":112.57,"y":175.57},{"position":"3B","x":137,"y":202},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":215.75,"y":167.56}],"runners":[{"id":"r2","x":112.57,"y":175.57,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"2B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Bunt Richtung 3B, Runner auf 2 — SS deckt die 3');

-- Runner auf 1 und 2 — Wheel Play – Stand 3
UPDATE play_step SET
    duration_ms = 3000,
    note = '3B nimmt auf und wirft zur 3 — der Führungs-Runner ist das Ziel.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":195},{"position":"C","x":155,"y":226},{"position":"1B","x":173.92,"y":190.67},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":112.57,"y":175.57},{"position":"3B","x":135,"y":200},{"position":"LF","x":99.05,"y":160.84},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":167.73,"y":145.88,"status":"ACTIVE"},{"id":"r2","x":112.57,"y":175.57,"status":"OUT"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Runner auf 1 und 2 — Wheel Play');

-- Runner auf 1 und 2 — Wheel Play – Stand 4
UPDATE play_step SET
    duration_ms = 2000,
    note = 'Alternative zum Stand davor: Ist der Führungs-Runner zu schnell, geht der Wurf an die 1 — ein sicherer Out statt gar keiner.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":195},{"position":"C","x":155,"y":226},{"position":"1B","x":173.92,"y":190.67},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":112.57,"y":175.57},{"position":"3B","x":135,"y":200},{"position":"LF","x":99.05,"y":160.84},{"position":"CF","x":155,"y":33},{"position":"RF","x":217.43,"y":175.57}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"2B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Runner auf 1 und 2 — Wheel Play');

-- Bunt direkt vor Home — Catcher übernimmt – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Wurf auf die 1.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":141,"y":198},{"position":"C","x":155,"y":212},{"position":"1B","x":175.06,"y":189.02},{"position":"2B","x":197.43,"y":175.57},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":212.6,"y":162.55}],"runners":[{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"2B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Bunt direkt vor Home — Catcher übernimmt');

-- Wurf auf die 2, Runner auf 3 startet – Stand 3
UPDATE play_step SET
    duration_ms = 3000,
    note = 'SS fängt und wirft sofort zurück nach Home.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":161.36,"y":139.51,"status":"ACTIVE"},{"id":"r3","x":138.03,"y":201.03,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Wurf auf die 2, Runner auf 3 startet');

-- Wurf auf die 2, Runner auf 3 startet – Stand 4
UPDATE play_step SET
    duration_ms = 2600,
    note = 'Zurück zur Platte — der Run ist wichtiger als der Out an der 2.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":238},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r3","x":138.03,"y":201.03,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Wurf auf die 2, Runner auf 3 startet');

-- Angetäuschter Wurf auf die 2 – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Wurf auf die 3 — Tag-Out, wenn er nicht zurückkommt.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":98.43,"y":161.43},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":178.33,"y":156.48,"status":"ACTIVE"},{"id":"r3","x":127.42,"y":190.42,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Angetäuschter Wurf auf die 2');

-- Direkter Wurf auf die 3 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Schneller Wurf auf die 3 — vom Catcher, nicht vom Pitcher.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":98.43,"y":161.43},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r3","x":118.94,"y":181.94,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Direkter Wurf auf die 3');

-- Direkter Wurf auf die 3 – Stand 4
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Tag — Inning vorbei.',
    outs = 3,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":98.43,"y":161.43},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":197.43,"y":175.57,"status":"ACTIVE"},{"id":"r3","x":118.94,"y":181.94,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Direkter Wurf auf die 3');

-- Rundown zwischen Home und 1 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Erst wenn der Runner festgelegt ist: ein Wurf zum Catcher.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":140.86,"y":232.14},{"position":"C","x":155,"y":218},{"position":"1B","x":186.82,"y":186.18},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":163.49,"y":209.51,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen Home und 1');

-- Rundown zwischen Home und 1 – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Tag. Ein Wurf reicht, wenn man ihn richtig anläuft.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":140.86,"y":232.14},{"position":"C","x":155,"y":218},{"position":"1B","x":186.82,"y":186.18},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"rb","x":163.49,"y":209.51,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen Home und 1');

-- Rundown zwischen 1 und 2 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Wurf zum 1B, sobald der Runner festgelegt ist.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":167.73,"y":145.88},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":211.57,"y":189.72}],"runners":[{"id":"r1","x":191.06,"y":169.21,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen 1 und 2');

-- Rundown zwischen 1 und 2 – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Tag an der 1.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":167.73,"y":145.88},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":211.57,"y":189.72}],"runners":[{"id":"r1","x":191.06,"y":169.21,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen 1 und 2');

-- Rundown zwischen 2 und 3 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Wurf zum 2B an der Base.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":125.3,"y":162.85},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":169.14,"y":119},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":149.91,"y":138.24,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen 2 und 3');

-- Rundown zwischen 2 und 3 – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Tag.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":125.3,"y":162.85},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":169.14,"y":119},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":149.91,"y":138.24,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen 2 und 3');

-- Rundown zwischen 3 und Home – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Wurf zum 3B.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":154.15,"y":217.15},{"position":"C","x":142.27,"y":205.27},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":98.43,"y":161.43},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":117.66,"y":180.66,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Rundown zwischen 3 und Home');

-- Rundown zwischen 3 und Home – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Tag an der 3. P ist nachgerückt, falls der Wurf danebengeht.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":154.15,"y":217.15},{"position":"C","x":142.27,"y":205.27},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":98.43,"y":161.43},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":117.66,"y":180.66,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
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

-- Steal auf die 2 — Wurf und Abdeckung – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'SS fängt und tagt.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":165.61,"y":143.75,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Steal auf die 2 — Wurf und Abdeckung');

-- Pickoff an der 1 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = '1B fängt an der Base.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":211.57,"y":161.43}],"runners":[{"id":"r1","x":189.65,"y":167.8,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Pickoff an der 1');

-- Pickoff an der 1 – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Tag, bevor der Runner zurück ist.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":211.57,"y":161.43}],"runners":[{"id":"r1","x":189.65,"y":167.8,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Pickoff an der 1');

-- Pickoff an der 2 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Wurf, SS ist genau rechtzeitig da.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":147.22,"y":140.93,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Pickoff an der 2');

-- Pickoff an der 2 – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Tag. Timing ist alles — zu früh und der Runner sieht ihn kommen.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":155,"y":133.15},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":147.22,"y":140.93,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"SS","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Pickoff an der 2');

-- Pickoff an der 3 – Stand 3
UPDATE play_step SET
    duration_ms = 600,
    note = 'Schneller Wurf.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":98.43,"y":161.43},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":120.35,"y":183.35,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Pickoff an der 3');

-- Pickoff an der 3 – Stand 4
UPDATE play_step SET
    duration_ms = 600,
    note = 'Tag. Geht der Wurf daneben, fällt der Run — nur bei sicherem Vorsprung.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":177,"y":140},{"position":"SS","x":133,"y":140},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":98.43,"y":161.43},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":120.35,"y":183.35,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"3B","x":112.57359312880715,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Pickoff an der 3');

-- Delayed Steal – Stand 3
UPDATE play_step SET
    duration_ms = 3000,
    note = 'P sieht es und wirft zur 2, der 2B deckt.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":163.49,"y":141.63,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 3 AND play_id = (SELECT id FROM play WHERE title = 'Delayed Steal');

-- Delayed Steal – Stand 4
UPDATE play_step SET
    duration_ms = 2000,
    note = 'Knapp. Dagegen hilft nur: nach jedem Wurf hinschauen.',
    outs = 0,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":133,"y":140},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":113.15},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"2B","x":155,"y":133.1471862576143,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Delayed Steal');

-- Infield In, Runner auf 3 – Stand 4
UPDATE play_step SET
    duration_ms = 2600,
    note = 'SS nimmt auf und wirft zum Catcher.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":161.61,"y":236.88},{"position":"C","x":155,"y":218},{"position":"1B","x":191.43,"y":185.57},{"position":"2B","x":175,"y":158},{"position":"SS","x":141,"y":178},{"position":"3B","x":118.57,"y":185.57},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r3","x":129.54,"y":192.54,"status":"OUT"},{"id":"rb","x":171.8,"y":201.2,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Infield In, Runner auf 3');

-- Ball am Zaun — Relay-Kette – Stand 5
UPDATE play_step SET
    duration_ms = 1200,
    note = 'Von dort nach Home. Der Run fällt — wichtig ist, dass der Batter auf der 2 bleibt.',
    outs = 1,
    markers = '{"defenders":[{"position":"P","x":153.49,"y":237.94},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":164.44,"y":93.12},{"position":"SS","x":169.75,"y":70.6},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":184.5,"y":8.06},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r1","x":133.79,"y":196.79,"status":"SCORED"},{"id":"rb","x":155,"y":133.15,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 5 AND play_id = (SELECT id FROM play WHERE title = 'Ball am Zaun — Relay-Kette');

-- Runner auf 2 und 3 — anschauen, dann werfen – Stand 4
UPDATE play_step SET
    duration_ms = 3000,
    note = 'Out an der 1, der Run fällt nicht. Dafür bleiben beide, wo sie sind.',
    outs = 2,
    markers = '{"defenders":[{"position":"P","x":155,"y":182},{"position":"C","x":155,"y":226},{"position":"1B","x":197.43,"y":175.57},{"position":"2B","x":177,"y":140},{"position":"SS","x":129,"y":146},{"position":"3B","x":119,"y":166},{"position":"LF","x":65,"y":62},{"position":"CF","x":155,"y":33},{"position":"RF","x":216.17,"y":182.54}],"runners":[{"id":"r2","x":155,"y":133.15,"status":"ACTIVE"},{"id":"r3","x":112.57,"y":175.57,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"OUT"}],"ball":{"state":"IN_HAND","holder":"1B","x":197.42640687119285,"y":175.57359312880715,"trajectory":"AIR"}}'::jsonb
WHERE ordinal = 4 AND play_id = (SELECT id FROM play WHERE title = 'Runner auf 2 und 3 — anschauen, dann werfen');
