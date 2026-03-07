-- Restaurants table (promotes hardcoded data to DB)
create table public.restaurants (
  id text primary key,
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  cuisine text[] not null default '{}',
  default_wait_estimate text not null default '~15 min',
  created_at timestamptz not null default now()
);

-- Seed with existing restaurants
insert into public.restaurants (id, name, address, lat, lng, cuisine, default_wait_estimate) values
  ('katzs', 'Katz''s Delicatessen', '205 E Houston St', 40.7223, -73.9874, '{Deli,Sandwich}', '~25 min'),
  ('joes-pizza', 'Joe''s Pizza', '7 Carmine St', 40.7308, -74.0021, '{Pizza}', '~12 min'),
  ('russ-daughters', 'Russ & Daughters', '179 E Houston St', 40.7222, -73.9882, '{Deli,Bagels}', '~15 min');

-- RLS: public read
alter table public.restaurants enable row level security;

create policy "Anyone can read restaurants"
  on public.restaurants for select
  using (true);

-- Seller sessions table
create table public.seller_sessions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  wait_duration_minutes integer,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Indexes
create index seller_sessions_restaurant_id_idx on public.seller_sessions (restaurant_id);
create index seller_sessions_started_at_idx on public.seller_sessions (started_at);
create unique index seller_sessions_active_per_seller_idx
  on public.seller_sessions (seller_id) where (status = 'active');

-- RLS
alter table public.seller_sessions enable row level security;

create policy "Anyone can read seller sessions"
  on public.seller_sessions for select
  using (true);

create policy "Sellers can insert own sessions"
  on public.seller_sessions for insert
  with check (auth.uid() = seller_id);

create policy "Sellers can update own sessions"
  on public.seller_sessions for update
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

-- RPC: get wait time stats grouped by restaurant for a given time bucket
create or replace function get_wait_time_stats(p_hour integer, p_is_weekend boolean)
returns table (
  restaurant_id text,
  avg_wait_minutes integer,
  report_count bigint,
  active_sellers bigint
)
language sql stable
as $$
  select
    r.id as restaurant_id,
    coalesce(
      (select round(avg(s.wait_duration_minutes))::integer
       from public.seller_sessions s
       where s.restaurant_id = r.id
         and s.status = 'completed'
         and s.wait_duration_minutes is not null
         and s.ended_at >= now() - interval '30 days'
         and abs(extract(hour from s.started_at) - p_hour) <= 1
         and (
           (p_is_weekend and extract(dow from s.started_at) in (0, 6))
           or (not p_is_weekend and extract(dow from s.started_at) not in (0, 6))
         )
      ), 0
    ) as avg_wait_minutes,
    (select count(*)
     from public.seller_sessions s
     where s.restaurant_id = r.id
       and s.status = 'completed'
       and s.wait_duration_minutes is not null
       and s.ended_at >= now() - interval '30 days'
       and abs(extract(hour from s.started_at) - p_hour) <= 1
       and (
         (p_is_weekend and extract(dow from s.started_at) in (0, 6))
         or (not p_is_weekend and extract(dow from s.started_at) not in (0, 6))
       )
    ) as report_count,
    (select count(*)
     from public.seller_sessions s
     where s.restaurant_id = r.id
       and s.status = 'active'
    ) as active_sellers
  from public.restaurants r;
$$;
