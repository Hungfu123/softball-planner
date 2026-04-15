-- Index für training_plans.training_id (UNIQUE hat implizit einen Index, aber explizit für Klarheit)
CREATE INDEX IF NOT EXISTS idx_training_plans_training_id ON training_plans(training_id);

-- Fehlende Indizes für substitutions (V11)
CREATE INDEX IF NOT EXISTS idx_substitutions_game_id ON substitutions(game_id);
