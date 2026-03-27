ALTER TABLE election_registrations
  ADD COLUMN IF NOT EXISTS patronymic    text,
  ADD COLUMN IF NOT EXISTS passport_number text;
