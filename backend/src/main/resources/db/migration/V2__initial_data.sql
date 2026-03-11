-- Players
INSERT INTO players (id, name) VALUES (1, 'Hung');
INSERT INTO players (id, name) VALUES (2, 'Khang');
INSERT INTO players (id, name) VALUES (3, 'An');
INSERT INTO players (id, name) VALUES (4, 'Anne');
INSERT INTO players (id, name) VALUES (5, 'Dat');
INSERT INTO players (id, name) VALUES (6, 'Daniel');
INSERT INTO players (id, name) VALUES (7, 'Mitchi');
INSERT INTO players (id, name) VALUES (8, 'Martin');
INSERT INTO players (id, name) VALUES (9, 'Madita');
INSERT INTO players (id, name) VALUES (10, 'Miriam');
INSERT INTO players (id, name) VALUES (11, 'Tomoki');
INSERT INTO players (id, name) VALUES (12, 'Tristan');
INSERT INTO players (id, name) VALUES (13, 'Dino');
INSERT INTO players (id, name) VALUES (14, 'Yuki');
INSERT INTO players (id, name) VALUES (15, 'Kairi');
INSERT INTO players (id, name) VALUES (16, 'Mike');
INSERT INTO players (id, name) VALUES (17, 'Vivi');
INSERT INTO players (id, name) VALUES (18, 'Florian');
INSERT INTO players (id, name) VALUES (19, 'Seb');
SELECT setval('players_id_seq', 19);

-- Seasons
INSERT INTO seasons (id, name, season_year) VALUES (1, 'Indoor Series', 2026);
SELECT setval('seasons_id_seq', 1);

-- League Teams
INSERT INTO league_teams (id, name, own_team, season_id) VALUES (1, 'Bottrop', FALSE, 1);
INSERT INTO league_teams (id, name, own_team, season_id) VALUES (2, 'Aachen', FALSE, 1);
INSERT INTO league_teams (id, name, own_team, season_id) VALUES (3, E'B\u00f6mmel', FALSE, 1);
INSERT INTO league_teams (id, name, own_team, season_id) VALUES (4, 'Wuppertal', FALSE, 1);
INSERT INTO league_teams (id, name, own_team, season_id) VALUES (5, 'Hagen', FALSE, 1);
INSERT INTO league_teams (id, name, own_team, season_id) VALUES (6, 'Dead Sox', TRUE, 1);
SELECT setval('league_teams_id_seq', 6);

-- Game Days
INSERT INTO game_days (id, date, label, location, season_id) VALUES (1, '2026-03-15', NULL, 'Bottrop', 1);
INSERT INTO game_days (id, date, label, location, season_id) VALUES (3, '2026-02-15', NULL, 'Hagen', 1);
SELECT setval('game_days_id_seq', 3);

-- Game Day Players (availability)
INSERT INTO game_day_players (game_day_id, player_id) VALUES (3, 5);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (3, 8);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (3, 10);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (3, 14);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (3, 1);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (3, 19);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (3, 18);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (3, 4);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (3, 7);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (3, 6);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (3, 2);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (3, 15);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (3, 16);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (1, 15);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (1, 7);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (1, 19);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (1, 8);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (1, 10);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (1, 9);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (1, 14);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (1, 4);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (1, 5);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (1, 12);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (1, 18);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (1, 13);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (1, 17);
INSERT INTO game_day_players (game_day_id, player_id) VALUES (1, 16);

-- Games
INSERT INTO games (id, game_number, score_us, score_them, game_day_id, opponent_team_id) VALUES (1, 1, NULL, NULL, 1, NULL);
INSERT INTO games (id, game_number, score_us, score_them, game_day_id, opponent_team_id) VALUES (2, 2, NULL, NULL, 1, NULL);
INSERT INTO games (id, game_number, score_us, score_them, game_day_id, opponent_team_id) VALUES (3, 3, NULL, NULL, 1, NULL);
INSERT INTO games (id, game_number, score_us, score_them, game_day_id, opponent_team_id) VALUES (7, 1, 4, 8, 3, 3);
INSERT INTO games (id, game_number, score_us, score_them, game_day_id, opponent_team_id) VALUES (8, 2, 1, 5, 3, 4);
INSERT INTO games (id, game_number, score_us, score_them, game_day_id, opponent_team_id) VALUES (9, 3, 9, 7, 3, 5);
SELECT setval('games_id_seq', 9);

-- Lineup Entries
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (31, 1, 'RF', 7, 4, 2);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (32, 2, 'THIRD_BASE', 7, 15, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (33, 3, 'P', 7, 19, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (34, 4, 'SS', 7, 14, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (35, 5, 'LF', 7, 16, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (36, 6, 'C', 7, 10, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (37, 7, 'FIRST_BASE', 7, 8, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (38, 8, 'CF', 7, 18, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (39, 9, 'SECOND_BASE', 7, 5, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (40, 10, 'EH', 7, 1, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (66, 1, 'P', 8, 2, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (67, 2, 'C', 8, 1, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (68, 3, 'RF', 8, 4, 15);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (69, 4, 'SS', 8, 14, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (70, 5, 'LF', 8, 16, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (71, 6, 'FIRST_BASE', 8, 6, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (72, 7, 'EH', 8, 7, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (73, 8, 'THIRD_BASE', 8, 18, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (74, 9, 'SECOND_BASE', 8, 10, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (75, 10, 'CF', 8, 5, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (81, 1, 'THIRD_BASE', 9, 2, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (82, 2, 'P', 9, 15, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (83, 3, 'SS', 9, 1, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (84, 4, 'SECOND_BASE', 9, 19, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (85, 5, 'RF', 9, 4, 14);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (86, 6, 'LF', 9, 6, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (87, 7, 'CF', 9, 7, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (88, 8, 'C', 9, 10, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (89, 9, 'FIRST_BASE', 9, 8, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (90, 10, 'EH', 9, 16, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (644, 1, 'EH', 2, 15, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (645, 2, 'FIRST_BASE', 2, 19, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (646, 3, 'SS', 2, 14, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (647, 4, 'RF', 2, 16, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (648, 5, 'THIRD_BASE', 2, 18, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (649, 6, 'P', 2, 9, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (650, 7, 'C', 2, 10, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (651, 8, 'CF', 2, 13, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (652, 9, 'SECOND_BASE', 2, 12, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (653, 10, 'LF', 2, 5, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (664, 1, 'THIRD_BASE', 3, 15, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (665, 2, 'SS', 3, 14, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (666, 3, 'EH', 3, 7, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (667, 4, 'RF', 3, 4, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (668, 5, 'CF', 3, 18, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (669, 6, 'C', 3, 10, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (670, 7, 'P', 3, 9, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (671, 8, 'FIRST_BASE', 3, 8, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (672, 9, 'SECOND_BASE', 3, 5, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (673, 10, 'LF', 3, 17, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (684, 1, 'CF', 1, 7, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (685, 2, 'P', 1, 15, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (686, 3, 'RF', 1, 4, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (687, 4, 'SS', 1, 19, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (688, 5, 'THIRD_BASE', 1, 16, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (689, 6, 'C', 1, 10, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (690, 7, 'LF', 1, 13, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (691, 8, 'FIRST_BASE', 1, 8, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (692, 9, 'SECOND_BASE', 1, 17, NULL);
INSERT INTO lineup_entries (id, batting_order, position, game_id, player_id, dh_batter_player_id) VALUES (693, 10, 'EH', 1, 12, NULL);
SELECT setval('lineup_entries_id_seq', 693);

-- Cars
INSERT INTO cars (id, total_seats, direction, driver_id, game_day_id) VALUES (1, 5, 'both', 16, 1);
INSERT INTO cars (id, total_seats, direction, driver_id, game_day_id) VALUES (3, 5, 'both', 19, 1);
INSERT INTO cars (id, total_seats, direction, driver_id, game_day_id) VALUES (4, 5, 'both', 14, 1);
SELECT setval('cars_id_seq', 4);

-- League Results
INSERT INTO league_results (id, home_score, away_score, date, home_team_id, away_team_id, season_id) VALUES (1, 2, 11, NULL, 5, 4, 1);
INSERT INTO league_results (id, home_score, away_score, date, home_team_id, away_team_id, season_id) VALUES (2, 2, 3, NULL, 5, 3, 1);
INSERT INTO league_results (id, home_score, away_score, date, home_team_id, away_team_id, season_id) VALUES (3, 4, 7, NULL, 4, 3, 1);
SELECT setval('league_results_id_seq', 3);
