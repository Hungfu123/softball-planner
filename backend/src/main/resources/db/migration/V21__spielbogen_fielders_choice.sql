ALTER TABLE spielbogen_at_bat DROP CONSTRAINT spielbogen_atbat_outtype_when_out;
ALTER TABLE spielbogen_at_bat ADD CONSTRAINT spielbogen_atbat_outtype_when_out CHECK (
    (result = 'OUT' AND (out_type IS NULL OR out_type IN
        ('GROUNDER','FLY','FOUL','UNASSISTED','DOUBLE_PLAY','TRIPLE_PLAY','FORCE_OUT','TAG_OUT','FIELDERS_CHOICE')))
    OR (result != 'OUT' AND out_type IS NULL)
);
