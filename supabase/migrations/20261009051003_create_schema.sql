create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  total_rooms int not null
);

create table public.daily_metrics (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  metric_date date not null default current_date,
  rooms_sold int not null,
  total_revenue numeric(10,2) not null,
  adr numeric(10,2) generated always as (total_revenue / nullif(rooms_sold, 0)) stored,
  occupancy_pct numeric(5,2) not null,
  revpar numeric(10,2) not null,
  unique (property_id, metric_date)
);

-- Covers the unique constraint's columns explicitly, per spec.
create index daily_metrics_property_id_metric_date_idx
  on public.daily_metrics (property_id, metric_date);

alter table public.properties enable row level security;
alter table public.daily_metrics enable row level security;

create policy "properties readable by anon" on public.properties
  for select to anon using (true);
create policy "properties readable by authenticated" on public.properties
  for select to authenticated using (true);
create policy "daily_metrics readable by anon" on public.daily_metrics
  for select to anon using (true);
create policy "daily_metrics readable by authenticated" on public.daily_metrics
  for select to authenticated using (true);

-- Explicit read-only grants (Data API exposure); no write privileges.
grant select on public.properties, public.daily_metrics to anon, authenticated;
