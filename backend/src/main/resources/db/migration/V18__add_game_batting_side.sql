-- Batting-Side: top = Gegner schlaegt zuerst (wir feldeln zuerst),
--                bottom = wir schlagen zuerst (Gegner feldelt zuerst).
-- null = noch nicht festgelegt → Frontend prompt User.

ALTER TABLE games ADD COLUMN batting_side VARCHAR(10) NULL
    CHECK (batting_side IS NULL OR batting_side IN ('top', 'bottom'));
