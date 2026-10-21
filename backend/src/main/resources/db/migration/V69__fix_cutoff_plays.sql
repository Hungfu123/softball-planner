-- Korrektur der Start-Plays. Erzeugt von scripts/build-seed-plays.mjs --seit <migration>.
--
-- Eine schon angewandte Migration wird NICHT geaendert: das waere eine Pruefsummen-
-- Kollision, Flyway braeche ab und das Backend startete nicht mehr.
--
-- Inhalt: Cut-off und Relay nach der Konvention der Dead Sox. Der Cut-Mann ist immer ein
-- Mittelinfielder — links und Mitte der SS, rechts der 2B; der andere deckt die 2, der
-- Mann an der Zielbase stellt ihn (Home der Catcher, die 3 der 3B), die Corner bleiben an
-- ihren Bases. Die Start-Plays trugen zuerst die Baseball-Variante (1B/3B als Cut fuer
-- Home). Siehe docs/PLAYMAKER.md.

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
    markers = '{"defenders":[{"position":"P","x":161,"y":244},{"position":"C","x":155,"y":218},{"position":"1B","x":191,"y":166},{"position":"2B","x":155,"y":133.15},{"position":"SS","x":119,"y":155.65},{"position":"3B","x":112.57,"y":175.57},{"position":"LF","x":95,"y":114.08},{"position":"CF","x":155,"y":33},{"position":"RF","x":245,"y":62}],"runners":[{"id":"r2","x":150.76,"y":213.76,"status":"ACTIVE"},{"id":"rb","x":197.43,"y":175.57,"status":"ACTIVE"}],"ball":{"state":"IN_HAND","holder":"C","x":155,"y":218,"trajectory":"AIR"}}'::jsonb
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
