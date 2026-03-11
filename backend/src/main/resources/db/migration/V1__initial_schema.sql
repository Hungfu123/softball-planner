-- Players
CREATE TABLE players (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- Seasons
CREATE TABLE seasons (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    season_year INTEGER NOT NULL
);

-- League Teams
CREATE TABLE league_teams (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    own_team BOOLEAN NOT NULL DEFAULT FALSE,
    season_id BIGINT NOT NULL REFERENCES seasons(id),
    UNIQUE (season_id, name)
);

-- Game Days
CREATE TABLE game_days (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    label VARCHAR(255),
    location VARCHAR(255),
    season_id BIGINT NOT NULL REFERENCES seasons(id),
    UNIQUE (season_id, date)
);

-- Game Day Players (availability)
CREATE TABLE game_day_players (
    game_day_id BIGINT NOT NULL REFERENCES game_days(id),
    player_id BIGINT NOT NULL REFERENCES players(id),
    PRIMARY KEY (game_day_id, player_id)
);

-- Games
CREATE TABLE games (
    id BIGSERIAL PRIMARY KEY,
    game_number INTEGER NOT NULL CHECK (game_number >= 1 AND game_number <= 3),
    score_us INTEGER,
    score_them INTEGER,
    game_day_id BIGINT NOT NULL REFERENCES game_days(id),
    opponent_team_id BIGINT REFERENCES league_teams(id)
);

-- Lineup Entries
CREATE TABLE lineup_entries (
    id BIGSERIAL PRIMARY KEY,
    batting_order INTEGER NOT NULL CHECK (batting_order >= 1 AND batting_order <= 10),
    position VARCHAR(255),
    game_id BIGINT NOT NULL REFERENCES games(id),
    player_id BIGINT NOT NULL REFERENCES players(id),
    dh_batter_player_id BIGINT REFERENCES players(id),
    UNIQUE (game_id, batting_order),
    UNIQUE (game_id, player_id)
);

-- Game Staff
CREATE TABLE game_staff (
    id BIGSERIAL PRIMARY KEY,
    role VARCHAR(255) NOT NULL,
    game_id BIGINT NOT NULL REFERENCES games(id),
    player_id BIGINT NOT NULL REFERENCES players(id),
    UNIQUE (game_id, role),
    UNIQUE (game_id, player_id)
);

-- Cars
CREATE TABLE cars (
    id BIGSERIAL PRIMARY KEY,
    total_seats INTEGER NOT NULL CHECK (total_seats >= 2 AND total_seats <= 9),
    direction VARCHAR(255) NOT NULL,
    driver_id BIGINT NOT NULL REFERENCES players(id),
    game_day_id BIGINT NOT NULL REFERENCES game_days(id),
    UNIQUE (game_day_id, driver_id)
);

-- League Results
CREATE TABLE league_results (
    id BIGSERIAL PRIMARY KEY,
    home_score INTEGER NOT NULL,
    away_score INTEGER NOT NULL,
    date DATE,
    home_team_id BIGINT NOT NULL REFERENCES league_teams(id),
    away_team_id BIGINT NOT NULL REFERENCES league_teams(id),
    season_id BIGINT NOT NULL REFERENCES seasons(id)
);
