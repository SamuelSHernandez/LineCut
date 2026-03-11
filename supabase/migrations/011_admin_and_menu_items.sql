-- 011: Admin role + Menu items table (replaces hardcoded menu data)

-- Admin role flag on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Menu items table (replaces hardcoded data)
CREATE TABLE public.menu_items (
  id text PRIMARY KEY,
  restaurant_id text NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  price integer NOT NULL, -- cents
  popular boolean NOT NULL DEFAULT false,
  available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX menu_items_restaurant_id_idx ON public.menu_items (restaurant_id);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read available menu items"
  ON public.menu_items FOR SELECT
  USING (true);

-- Only service_role (admin API) can write menu items
GRANT ALL ON public.menu_items TO service_role;
GRANT SELECT ON public.menu_items TO authenticated;

-- Seed menu items from the existing hardcoded data (prices in cents)
INSERT INTO public.menu_items (id, restaurant_id, name, price, popular, sort_order) VALUES
  ('katzs-1', 'katzs', 'Pastrami on Rye', 2495, true, 1),
  ('katzs-2', 'katzs', 'Corned Beef on Rye', 2495, true, 2),
  ('katzs-3', 'katzs', 'Reuben', 2695, true, 3),
  ('katzs-4', 'katzs', 'Matzo Ball Soup', 895, true, 4),
  ('katzs-5', 'katzs', 'Knish', 695, false, 5),
  ('katzs-6', 'katzs', 'Hot Dog', 595, false, 6),
  ('joes-1', 'joes-pizza', 'Plain Slice', 350, true, 1),
  ('joes-2', 'joes-pizza', 'Sicilian Slice', 450, true, 2),
  ('joes-3', 'joes-pizza', 'Fresh Mozzarella Slice', 500, true, 3),
  ('joes-4', 'joes-pizza', 'Two Slices + Drink', 950, true, 4),
  ('joes-5', 'joes-pizza', 'Whole Pie Plain', 2800, false, 5),
  ('russ-1', 'russ-daughters', 'Classic Bagel & Lox', 1800, true, 1),
  ('russ-2', 'russ-daughters', 'Whitefish Salad on Bagel', 1600, true, 2),
  ('russ-3', 'russ-daughters', 'Super Heebster', 2100, true, 3),
  ('russ-4', 'russ-daughters', 'Chopped Liver on Rye', 1400, true, 4),
  ('russ-5', 'russ-daughters', 'Borscht', 900, false, 5),
  ('russ-6', 'russ-daughters', 'Babka Chocolate', 1600, false, 6);

-- Add write policies for restaurants (admin use via service_role)
-- Service role bypasses RLS, so no explicit write policy needed for admin
-- But we need insert/update for any future admin-as-user flow
GRANT INSERT, UPDATE, DELETE ON public.restaurants TO service_role;

-- Trigger for updated_at on menu_items
CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
