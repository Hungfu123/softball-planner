-- „Double Play" statt „Doppelspiel", aus demselben Grund wie covern statt decken (V77):
-- auf dem Platz sagt das Team den englischen Begriff, und ein Lernstoff, der ein anderes
-- Wort benutzt als seine Leser, kostet bei jedem Lesen eine Uebersetzung.
--
-- „Standard-Doppelspiel" zuerst, damit daraus „Standard-Double-Play" wird und nicht
-- „Standard-Double Play" mit abgerissenem Bindestrich.

UPDATE play_step SET note = replace(note, 'Standard-Doppelspiel', 'Standard-Double-Play')
WHERE note LIKE '%Standard-Doppelspiel%';

UPDATE play_step SET note = replace(note, 'Doppelspiel', 'Double Play')
WHERE note LIKE '%Doppelspiel%';

UPDATE play SET title = replace(title, 'Doppelspiel', 'Double Play')
WHERE title LIKE '%Doppelspiel%';

UPDATE play SET game_state_note = replace(game_state_note, 'Doppelspiel', 'Double Play')
WHERE game_state_note LIKE '%Doppelspiel%';
