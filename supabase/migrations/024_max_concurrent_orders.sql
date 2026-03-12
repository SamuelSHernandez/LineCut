-- Add max concurrent orders limit per seller (separate from max_order_cap which is a dollar amount)
ALTER TABLE profiles ADD COLUMN max_concurrent_orders integer NOT NULL DEFAULT 3;
