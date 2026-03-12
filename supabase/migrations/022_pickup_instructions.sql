-- Add pickup instructions to seller sessions and orders
ALTER TABLE seller_sessions ADD COLUMN pickup_instructions text;
ALTER TABLE orders ADD COLUMN pickup_instructions text;
