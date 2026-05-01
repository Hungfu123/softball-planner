ALTER TABLE spielbogen_stealing_event DROP CONSTRAINT spielbogen_stealing_type_check;
ALTER TABLE spielbogen_stealing_event ADD CONSTRAINT spielbogen_stealing_type_check CHECK (
    type IN ('STOLEN_BASE','CAUGHT_STEALING','OUT_ON_PLAY','WILD_PITCH','PASSED_BALL')
);
