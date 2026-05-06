-- V10 versuchte H2-Constraint-Namen "CONSTRAINT_2" zu droppen, der auf Postgres nicht existiert.
-- Original V1-Constraint hat Postgres-Name "games_game_number_check" (auto-generiert) und beschränkt
-- auf 1..3. V10 fügte zusätzlich "games_number_check" (1..10) hinzu — beide Checks aktiv,
-- effektiver Bereich = 1..3.
-- Fix: Beide möglichen Constraint-Namen droppen (idempotent), dann sauber 1..10 setzen.
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_game_number_check;
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_number_check;
ALTER TABLE games ADD CONSTRAINT games_number_check CHECK (game_number >= 1 AND game_number <= 10);
