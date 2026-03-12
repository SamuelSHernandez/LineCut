-- Add image URLs to restaurants and menu items
ALTER TABLE restaurants ADD COLUMN image_url text;
ALTER TABLE menu_items ADD COLUMN image_url text;
