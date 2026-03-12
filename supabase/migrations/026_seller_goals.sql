-- Seller daily goals and gamification
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_order_goal integer DEFAULT 10;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_date date;
