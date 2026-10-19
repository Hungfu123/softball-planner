-- Stammdaten fuer die Trainerabrechnung des Hochschulsports.
--
-- Eine Zeile, id = 1: die App hat genau einen Uebungsleiter. Was hier steht, sind die
-- Felder, die auf dem Abrechnungsbogen von Hand ausgefuellt wurden — Anschrift, Kurs,
-- Stundensatz, Monatsdeckel, Empfaengerin und die einmal hinterlegte Unterschrift.
--
-- Absichtlich OHNE Daten: personenbezogene Angaben gehoeren nicht in eine Migration,
-- die in jedem Klon und jeder Testdatenbank laeuft. Die Zeile entsteht beim ersten
-- Speichern im Formular (oder per Hand auf dem Server).
CREATE TABLE coach_billing_profile (
    id              BIGINT PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    street          VARCHAR(200) NOT NULL,
    zip             VARCHAR(10)  NOT NULL,
    city            VARCHAR(100) NOT NULL,
    sport_course    VARCHAR(100) NOT NULL,
    hourly_rate     NUMERIC(6,2) NOT NULL,
    -- Der Vertrag deckelt den Monat. Steht hier und nicht im Code, weil er sich
    -- aendern kann, ohne dass die Rechenlogik eine andere wird.
    max_hours       INT          NOT NULL DEFAULT 12,
    -- Anrede in der Mail ("Hallo Alice,"). Leer heisst: nur "Hallo,".
    recipient_name  VARCHAR(100),
    recipient_email VARCHAR(200) NOT NULL,
    -- PNG als Data-URL. Einmal mit dem Finger gezeichnet, danach in jeder PDF.
    signature_png   TEXT,
    CONSTRAINT coach_billing_profile_single_row CHECK (id = 1)
);
