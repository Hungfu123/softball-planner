-- Accounts: ein Zugang je Spieler, drei Rollen (SUPERADMIN, ADMIN, PLAYER).
-- Bewusst ohne INSERT: Accounts und Passwoerter gehoeren nicht in eine Datei im Repository.
-- Den ersten Superadmin legt der AccountBootstrap beim Start an.
CREATE TABLE app_user (
    id               BIGSERIAL PRIMARY KEY,
    player_id        BIGINT      NOT NULL UNIQUE REFERENCES players (id) ON DELETE CASCADE,
    username         TEXT        NOT NULL,
    password_hash    TEXT        NOT NULL,
    role             TEXT        NOT NULL,
    may_score        BOOLEAN     NOT NULL DEFAULT FALSE,
    locked           BOOLEAN     NOT NULL DEFAULT FALSE,
    password_changed BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL,
    last_login_at    TIMESTAMPTZ,
    last_seen_at     TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_app_user_username ON app_user (lower(username));
