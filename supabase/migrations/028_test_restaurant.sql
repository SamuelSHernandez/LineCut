INSERT INTO public.restaurants (id, name, address, lat, lng, cuisine, default_wait_estimate)
VALUES ('test', 'Test', 'Test Location, MD', 39.09148115780004, -76.96419360169294, ARRAY['Test'], '~10 min')
ON CONFLICT (id) DO NOTHING;
