-- Shared updated_at trigger function
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  is_buyer boolean not null default false,
  is_seller boolean not null default false,
  avatar_url text,
  phone text,
  trust_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint at_least_one_role check (is_buyer or is_seller)
);

-- Auto-update updated_at
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function handle_updated_at();

-- Index for chronological queries
create index profiles_created_at_idx on public.profiles (created_at);

-- Trigger: auto-create profile row when a user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, is_buyer, is_seller)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'User'),
    coalesce((new.raw_user_meta_data->>'is_buyer')::boolean, false),
    coalesce((new.raw_user_meta_data->>'is_seller')::boolean, false)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Enable RLS
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile (and only their own)
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
