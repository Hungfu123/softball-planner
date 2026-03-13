-- Foreign key indexes for query performance
CREATE INDEX IF NOT EXISTS idx_game_days_season_id ON game_days(season_id);
CREATE INDEX IF NOT EXISTS idx_games_game_day_id ON games(game_day_id);
CREATE INDEX IF NOT EXISTS idx_games_opponent_team_id ON games(opponent_team_id);
CREATE INDEX IF NOT EXISTS idx_lineup_entries_game_id ON lineup_entries(game_id);
CREATE INDEX IF NOT EXISTS idx_game_staff_game_id ON game_staff(game_id);
CREATE INDEX IF NOT EXISTS idx_training_attendance_training_id ON training_attendance(training_id);
CREATE INDEX IF NOT EXISTS idx_training_attendance_player_id ON training_attendance(player_id);
CREATE INDEX IF NOT EXISTS idx_trainings_period_id ON trainings(period_id);
CREATE INDEX IF NOT EXISTS idx_trainings_date ON trainings(date);
CREATE INDEX IF NOT EXISTS idx_league_results_season_id ON league_results(season_id);
CREATE INDEX IF NOT EXISTS idx_cars_game_day_id ON cars(game_day_id);
