-- Add configurable pickup timeout for sellers (buyer no-show window)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pickup_timeout_minutes integer NOT NULL DEFAULT 10;

ALTER TABLE profiles
  ADD CONSTRAINT pickup_timeout_minutes_range
  CHECK (pickup_timeout_minutes BETWEEN 5 AND 30);
