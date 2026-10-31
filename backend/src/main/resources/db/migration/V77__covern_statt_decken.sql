-- „covern" statt „decken", in Titeln und Notizen der Plays.
--
-- Vorgabe des Betreibers: auf dem Platz sagt das Team covern. Ein Lernstoff, der ein
-- anderes Wort benutzt als die Leute, die ihn benutzen sollen, kostet bei jedem Lesen
-- eine Uebersetzung.
--
-- Die drei Faelle mit abgetrenntem „ab" stehen zuerst: „abcovern" gibt es nicht, also
-- faellt die Vorsilbe weg statt mitzuwandern. Danach erst das blanke Wort.
--
-- Eine schon angewandte Migration wird NICHT geaendert — das waere eine Pruefsummen-
-- Kollision. Deshalb diese hier.

UPDATE play_step SET note = replace(note, 'deckt die Platte ab', 'covert die Platte')
WHERE note LIKE '%deckt die Platte ab%';

UPDATE play_step SET note = replace(note, 'deckt dort ab', 'covert dort')
WHERE note LIKE '%deckt dort ab%';

UPDATE play_step SET note = replace(note, 'deckt der SS ab', 'covert der SS')
WHERE note LIKE '%deckt der SS ab%';

UPDATE play_step SET note = replace(note, 'deckt ab', 'covert')
WHERE note LIKE '%deckt ab%';

UPDATE play_step SET note = replace(replace(note, 'deckt', 'covert'), 'decken', 'covern')
WHERE note LIKE '%deckt%' OR note LIKE '%decken%';

UPDATE play SET title = replace(replace(title, 'deckt', 'covert'), 'decken', 'covern')
WHERE title LIKE '%deckt%' OR title LIKE '%decken%';

UPDATE play SET game_state_note = replace(replace(game_state_note, 'deckt', 'covert'), 'decken', 'covern')
WHERE game_state_note LIKE '%deckt%' OR game_state_note LIKE '%decken%';

-- „Wurf und Abdeckung" heisst auf dem Platz „Wurf und Coverage" — dasselbe Wort, das
-- auch die Kategorie Base-Coverage traegt.
UPDATE play SET title = replace(title, 'Abdeckung', 'Coverage')
WHERE title LIKE '%Abdeckung%';

-- „den Deckenden" laesst sich nicht Wort fuer Wort uebersetzen: „den Covernden" ist
-- keins. Der Satz wird umgestellt.
UPDATE play_step SET note = 'An der 2 braucht es ein Zeichen — der Runner sieht nicht, wer covert.'
WHERE note = 'An der 2 braucht es ein Zeichen — der Runner sieht den Deckenden nicht.';
