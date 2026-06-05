-- Seed der beiden echten Einladungs-Vorlagen (Indoor Series, College Series "Cose").
-- Volltext aus den Original-PDFs — danach in der App editier-/duplizierbar.

INSERT INTO invitations (title, letter_date, event_date, venue, pairing_mode, body_text, guest_teams, games, contacts)
VALUES (
  'Indoor Series Turnier',
  DATE '2026-03-16',
  DATE '2026-03-21',
  'Sporthalle der Heinrich-Heine-Universität Düsseldorf',
  'TEAM_1_2',
  E'Anfahrt:\nDas Turnier findet in der Sporthalle der Heinrich-Heine-Universität Düsseldorf statt. Am Besten parkt ihr auf dem Park & Ride Parkplatz an der Haltestelle Düsseldorf Südpark. Von da aus geht ihr an dem beschrankten Bahnübergang vorbei, den Fußweg an den Bahngleisen entlang. Ihr kommt dann "ins Grüne" und geht bei der ersten Möglichkeit rechts. Dann nur noch durch die Tür im Zaun und schon seid ihr auf unserem Platz, die Sporthalle ist auf der rechten Seite.\n\nFür das leibliche Wohl ist wie immer gesorgt.',
  '["Aixplosives","Padres","Roadrunners"]',
  '[
    {"time":"10:00","teamA":"Dead Sox","teamB":"Aixplosives","ump":"Roadrunners"},
    {"time":"11:10","teamA":"Aixplosives","teamB":"Roadrunners","ump":"Dead Sox"},
    {"time":"12:20","teamA":"Padres","teamB":"Roadrunners","ump":"Aixplosives"},
    {"time":"13:30","teamA":"Padres","teamB":"Aixplosives","ump":"Roadrunners"},
    {"time":"14:40","teamA":"Dead Sox","teamB":"Roadrunners","ump":"Padres"},
    {"time":"15:50","teamA":"Dead Sox","teamB":"Padres","ump":"Aixplosives"}
  ]',
  '[
    {"role":"Trainer","name":"Sebastien Messier","email":"sebshuttle@gmail.com","phone":"0176 80639707"},
    {"role":"Obfrau","name":"Anne Steinfort","email":"anne.steinfort@googlemail.com","phone":"0157 88110320"}
  ]'
);

INSERT INTO invitations (title, letter_date, event_date, venue, pairing_mode, body_text, guest_teams, games, contacts)
VALUES (
  'Vorrundenturnier der College Series',
  DATE '2024-06-24',
  DATE '2024-06-29',
  'Rasenplatz der Heinrich-Heine-Universität Düsseldorf',
  'HEIM_GAST',
  E'Anfahrt:\nDas Turnier findet auf dem Rasenplatz der Heinrich-Heine-Universität Düsseldorf statt. Am Besten parkt ihr auf dem Park & Ride Parkplatz an der Haltestelle Düsseldorf Südpark. Von da aus geht ihr an dem beschrankten Bahnübergang vorbei, den Fußweg an den Bahngleisen entlang. Ihr kommt dann "ins Grüne" und geht bei der ersten Möglichkeit rechts. Dann nur noch durch die Tür im Zaun und schon seid ihr auf unserem Platz.\n\nFür das leibliche Wohl ist wie immer gesorgt.',
  '["Dragons","Travellers","Padres"]',
  '[
    {"time":"10:00","teamA":"Dead Sox","teamB":"Dragons","ump":"Padres"},
    {"time":"10:00","teamA":"Travellers","teamB":"Padres","ump":"Dragons"},
    {"time":"13:00","teamA":"Dead Sox","teamB":"Travellers","ump":"Dragons"},
    {"time":"13:00","teamA":"Padres","teamB":"Dragons","ump":"Travellers"},
    {"time":"15:30","teamA":"Dead Sox","teamB":"Padres","ump":"Travellers"},
    {"time":"15:30","teamA":"Dragons","teamB":"Travellers","ump":"Padres"}
  ]',
  '[
    {"role":"Trainer","name":"Daniel Baur","email":"daniel.baur.789@gmail.com","phone":"0171 1402273"},
    {"role":"Obfrau","name":"Anne Steinfort","email":"anne.steinfort@googlemail.com","phone":"0157 88110320"}
  ]'
);
