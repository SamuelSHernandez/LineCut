-- Remove test data seeded by migrations 028-030
-- These were useful during development but should not exist in production.

DELETE FROM seller_sessions WHERE restaurant_id = 'test';
DELETE FROM menu_items WHERE restaurant_id = 'test';
DELETE FROM profiles WHERE id = '00000000-0000-0000-0000-000000000001';
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';
DELETE FROM restaurants WHERE id = 'test';
