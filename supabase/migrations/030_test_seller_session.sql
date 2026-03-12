-- Test seller user and active session for local development testing.
-- Creates a minimal auth.users entry, profile, and live session at the test restaurant.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, confirmation_token,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'testseller@linecut.test', '',
      now(), now(), now(), '',
      '{"provider":"email","providers":["email"]}',
      '{"display_name":"Test Seller"}'
    );
  END IF;
END $$;

INSERT INTO public.profiles (
  id, display_name, is_seller, is_buyer, trust_score,
  stripe_connect_status, kyc_status, completed_deliveries,
  max_concurrent_orders, daily_order_goal
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Seller', true, false, 85,
  'active', 'approved', 30,
  3, 10
) ON CONFLICT (id) DO NOTHING;

-- Active session at the test restaurant
INSERT INTO public.seller_sessions (
  seller_id, restaurant_id, estimated_wait_minutes,
  seller_fee_cents, pickup_instructions, status
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test', 20, 500,
  'Meet at the front entrance', 'active'
);
