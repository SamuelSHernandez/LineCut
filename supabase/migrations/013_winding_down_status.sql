-- Add 'winding_down' to seller_sessions status
-- This status means: no new orders accepted, but existing orders continue until done.

-- 1. Drop the existing inline check constraint.
--    PostgreSQL auto-names inline check constraints as <table>_<column>_check.
alter table public.seller_sessions drop constraint seller_sessions_status_check;

-- 2. Re-add with the new value included.
alter table public.seller_sessions
  add constraint seller_sessions_status_check
  check (status in ('active', 'winding_down', 'completed', 'cancelled'));

-- 3. Update the unique partial index so a seller cannot start a new session
--    while one is winding down either.
drop index if exists seller_sessions_active_per_seller_idx;
create unique index seller_sessions_active_per_seller_idx
  on public.seller_sessions (seller_id) where (status in ('active', 'winding_down'));
