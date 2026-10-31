-- „Outfield-Basics" statt „Outfield".
--
-- Der Name soll beides sagen: wo du stehst UND dass es der Anfang ist. Die Mannschaft
-- ist eine Hobbymannschaft, viele lernen Spielsituationen ueberhaupt erst — und eine
-- Kategorie, die nur „Outfield" heisst, sieht aus wie das ganze Thema statt wie der
-- Einstieg. Cut-off und Relay stehen eine Stufe hoeher und bleiben dort.

UPDATE play_category SET name = 'Outfield-Basics' WHERE name = 'Outfield';
