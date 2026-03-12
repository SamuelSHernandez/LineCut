-- Add Google Place ID to restaurants for business hours lookup
ALTER TABLE restaurants ADD COLUMN google_place_id text;
