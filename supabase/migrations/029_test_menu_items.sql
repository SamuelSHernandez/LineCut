INSERT INTO public.menu_items (id, restaurant_id, name, price, popular) VALUES
  (gen_random_uuid(), 'test', 'Test Burger', 999, true),
  (gen_random_uuid(), 'test', 'Test Fries', 499, true),
  (gen_random_uuid(), 'test', 'Test Shake', 599, false)
ON CONFLICT DO NOTHING;
