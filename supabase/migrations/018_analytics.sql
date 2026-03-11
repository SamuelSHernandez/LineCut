-- Analytics events table for lightweight server-side event tracking.
-- NOTE: For production scale, consider range-partitioning this table
-- by created_at (e.g., monthly partitions) once event volume grows.

create table if not exists analytics_events (
  id         uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id    uuid references profiles(id) on delete set null,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Query patterns: filter by event_name + time range, or by user + time range
create index idx_analytics_events_name_created
  on analytics_events (event_name, created_at desc);

create index idx_analytics_events_user_created
  on analytics_events (user_id, created_at desc)
  where user_id is not null;

-- RLS: no public access. Only service_role (bypasses RLS) writes/reads.
alter table analytics_events enable row level security;

-- Explicitly deny all access through the API (anon / authenticated roles).
-- service_role bypasses RLS, so admin/server operations still work.
-- No policies = no access for non-service-role clients.
