-- One-time bonus for enabling push notifications
ALTER TABLE profiles
  ADD COLUMN notification_bonus_awarded BOOLEAN NOT NULL DEFAULT false;
