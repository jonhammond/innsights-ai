-- Portfolio expansion: 7 more hotels, segment-aware generator, 20+ new metrics,
-- portfolio_daily view. Existing rows are backfilled; revenue/ADR/occupancy untouched.

-- ---------------------------------------------------------------------------
-- a. properties
-- ---------------------------------------------------------------------------
alter table public.properties
  add column segment text not null default 'upscale'
    constraint properties_segment_check
    check (segment in ('luxury', 'upper_upscale', 'upscale', 'upper_midscale', 'midscale')),
  add column base_adr numeric(10,2) not null default 180,
  add column market text not null default '',
  add constraint properties_name_key unique (name);

update public.properties p
set segment = v.segment, base_adr = v.base_adr, market = v.market
from (values
  ('Grand Hyatt Downtown',  'upper_upscale', 250::numeric, 'Denver'),
  ('The Ritz Waterfront',   'luxury',        450::numeric, 'Miami'),
  ('Courtyard Tech Center', 'upscale',       160::numeric, 'Austin')
) as v (name, segment, base_adr, market)
where p.name = v.name;

insert into public.properties (name, location, total_rooms, segment, base_adr, market) values
  ('Harborview Resort & Spa',    'San Diego, CA',   280, 'luxury',         420, 'San Diego'),
  ('The Beacon Boutique',        'Boston, MA',       95, 'upper_upscale',  310, 'Boston'),
  ('Summit Lodge Aspen',         'Aspen, CO',       120, 'luxury',         520, 'Aspen'),
  ('Riverside Inn & Suites',     'Nashville, TN',   180, 'upper_midscale', 165, 'Nashville'),
  ('Metro Express Airport',      'Chicago, IL',     240, 'midscale',       125, 'Chicago'),
  ('Palm Grove Hotel',           'Scottsdale, AZ',  210, 'upscale',        230, 'Scottsdale'),
  ('Lakeside Conference Center', 'Minneapolis, MN', 400, 'upscale',        190, 'Minneapolis')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- b. daily_metrics: new columns, generated columns, constraints
-- ---------------------------------------------------------------------------
alter table public.daily_metrics
  add column bookings int not null default 0,
  add column direct_bookings int not null default 0,
  add column ota_bookings int not null default 0,
  add column gds_bookings int not null default 0,
  add column group_bookings int not null default 0,
  add column cancellations int not null default 0,
  add column avg_booking_window_days numeric(5,1) not null default 0,
  add column rooms_cost numeric(10,2) not null default 0,
  add column fnb_cost numeric(10,2) not null default 0,
  add column admin_cost numeric(10,2) not null default 0,
  add column marketing_cost numeric(10,2) not null default 0,
  add column maintenance_cost numeric(10,2) not null default 0,
  add column utilities_cost numeric(10,2) not null default 0,
  add column market_occupancy_pct numeric(5,2) not null default 0,
  add column market_adr numeric(10,2) not null default 0,
  add column market_revpar numeric(10,2) not null default 0,
  add column nps numeric(5,1) not null default 0,
  add column csat numeric(3,2) not null default 0,
  add column repeat_guest_pct numeric(5,2) not null default 0,
  add column rooms_cleaned int not null default 0,
  add column housekeeping_hours numeric(6,2) not null default 0;

-- Generated columns cannot reference other generated columns, so gop repeats the
-- cost sum and ari derives ADR from total_revenue / rooms_sold.
alter table public.daily_metrics
  add column total_cost numeric(11,2) generated always as (
    rooms_cost + fnb_cost + admin_cost + marketing_cost + maintenance_cost + utilities_cost
  ) stored,
  add column gop numeric(11,2) generated always as (
    total_revenue
    - (rooms_cost + fnb_cost + admin_cost + marketing_cost + maintenance_cost + utilities_cost)
  ) stored,
  add column cpor numeric(10,2) generated always as (
    round(
      (rooms_cost + fnb_cost + admin_cost + marketing_cost + maintenance_cost + utilities_cost)
      / nullif(rooms_sold, 0),
      2
    )
  ) stored,
  add column mpi numeric(8,2) generated always as (
    round(occupancy_pct / nullif(market_occupancy_pct, 0) * 100, 2)
  ) stored,
  add column ari numeric(8,2) generated always as (
    round(total_revenue / nullif(rooms_sold, 0) / nullif(market_adr, 0) * 100, 2)
  ) stored,
  add column rgi numeric(8,2) generated always as (
    round(revpar / nullif(market_revpar, 0) * 100, 2)
  ) stored;

alter table public.daily_metrics
  add constraint daily_metrics_nps_range check (nps between -100 and 100),
  add constraint daily_metrics_csat_range check (csat between 0 and 5),
  add constraint daily_metrics_market_occupancy_range check (market_occupancy_pct between 0 and 100),
  add constraint daily_metrics_repeat_guest_range check (repeat_guest_pct between 0 and 100),
  add constraint daily_metrics_channel_sum check (
    direct_bookings + ota_bookings + gds_bookings + group_bookings = bookings
  ),
  add constraint daily_metrics_cancellations_lte_bookings check (cancellations <= bookings),
  add constraint daily_metrics_counts_nonneg check (
    bookings >= 0 and direct_bookings >= 0 and ota_bookings >= 0 and gds_bookings >= 0
    and group_bookings >= 0 and cancellations >= 0 and rooms_cleaned >= 0
  );

-- ---------------------------------------------------------------------------
-- c. synth_metric_extras
-- ---------------------------------------------------------------------------
create type public.metric_extras as (
  bookings int,
  direct_bookings int,
  ota_bookings int,
  gds_bookings int,
  group_bookings int,
  cancellations int,
  avg_booking_window_days numeric(5,1),
  rooms_cost numeric(10,2),
  fnb_cost numeric(10,2),
  admin_cost numeric(10,2),
  marketing_cost numeric(10,2),
  maintenance_cost numeric(10,2),
  utilities_cost numeric(10,2),
  market_occupancy_pct numeric(5,2),
  market_adr numeric(10,2),
  market_revpar numeric(10,2),
  nps numeric(5,1),
  csat numeric(3,2),
  repeat_guest_pct numeric(5,2),
  rooms_cleaned int,
  housekeeping_hours numeric(6,2)
);

create or replace function public.synth_metric_extras(
  total_rooms int,
  rooms_sold int,
  total_revenue numeric,
  segment text,
  target_date date
)
returns public.metric_extras
language plpgsql
set search_path = public
as $$
declare
  r public.metric_extras;
  cancel_rate numeric := (case segment
    when 'luxury'         then 0.06 + random()::numeric * 0.06
    when 'upper_upscale'  then 0.08 + random()::numeric * 0.07
    when 'midscale'       then 0.12 + random()::numeric * 0.10
    else                       0.09 + random()::numeric * 0.08
  end);  -- OTA-heavy segments cancel more
  cost_ratio numeric;
  cost_total numeric;
  w numeric[];
  w_sum numeric;
  ch numeric[];  -- direct, ota, gds, group
  ch_sum numeric;
  n_ota int;
  n_gds int;
  n_grp int;
  occ numeric;
  own_adr numeric;
  own_revpar numeric;
begin
  -- Distribution -----------------------------------------------------------
  r.cancellations := round(rooms_sold * cancel_rate / (1 - cancel_rate))::int;
  r.bookings := greatest(rooms_sold + r.cancellations, 0);

  ch := case segment
    when 'luxury'         then array[0.45, 0.25, 0.10, 0.20]
    when 'upper_upscale'  then array[0.40, 0.25, 0.15, 0.20]
    when 'upscale'        then array[0.30, 0.35, 0.15, 0.20]
    when 'upper_midscale' then array[0.25, 0.45, 0.10, 0.20]
    else                       array[0.20, 0.55, 0.10, 0.15]
  end;
  if total_rooms >= 400 then  -- conference-scale properties are group-heavy
    ch := array[0.20, 0.20, 0.10, 0.50];
  end if;
  ch_sum := 0;
  for i in 1..4 loop
    ch[i] := ch[i] * (0.90 + random()::numeric * 0.20);
    ch_sum := ch_sum + ch[i];
  end loop;
  for i in 1..4 loop
    ch[i] := ch[i] / ch_sum;
  end loop;
  -- Round the minor channels, remainder goes to direct so the sum is exact.
  n_ota := least(round(r.bookings * ch[2])::int, r.bookings);
  n_gds := least(round(r.bookings * ch[3])::int, r.bookings - n_ota);
  n_grp := least(round(r.bookings * ch[4])::int, r.bookings - n_ota - n_gds);
  r.ota_bookings := n_ota;
  r.gds_bookings := n_gds;
  r.group_bookings := n_grp;
  r.direct_bookings := r.bookings - n_ota - n_gds - n_grp;

  r.avg_booking_window_days := round((case segment
    when 'luxury'   then 30 + random()::numeric * 15
    when 'midscale' then 3 + random()::numeric * 7
    else                 10 + random()::numeric * 15
  end)::numeric, 1);

  -- Cost -------------------------------------------------------------------
  cost_ratio := (case segment
    when 'luxury'         then 0.62
    when 'upper_upscale'  then 0.58
    when 'upscale'        then 0.54
    when 'upper_midscale' then 0.50
    else                       0.46
  end) + (random()::numeric - 0.5) * 0.06;
  cost_total := total_revenue * cost_ratio;
  -- rooms, fnb, admin, marketing, maintenance, utilities (base shares, jittered, normalised)
  w := array[0.30, 0.25, 0.15, 0.10, 0.10, 0.10];
  w_sum := 0;
  for i in 1..6 loop
    w[i] := w[i] * (0.85 + random()::numeric * 0.30);
    w_sum := w_sum + w[i];
  end loop;
  r.rooms_cost       := round(cost_total * w[1] / w_sum, 2);
  r.fnb_cost         := round(cost_total * w[2] / w_sum, 2);
  r.admin_cost       := round(cost_total * w[3] / w_sum, 2);
  r.marketing_cost   := round(cost_total * w[4] / w_sum, 2);
  r.maintenance_cost := round(cost_total * w[5] / w_sum, 2);
  r.utilities_cost   := round(cost_total * w[6] / w_sum, 2);

  -- Market comp set (own values x 0.85..1.15) --------------------------------
  occ := case when total_rooms > 0 then rooms_sold::numeric / total_rooms * 100 else 0 end;
  own_adr := case when rooms_sold > 0 then total_revenue / rooms_sold else 0 end;
  own_revpar := case when total_rooms > 0 then total_revenue / total_rooms else 0 end;
  r.market_occupancy_pct := round(least(occ * (0.85 + random()::numeric * 0.30), 100), 2);
  r.market_adr    := round(own_adr * (0.85 + random()::numeric * 0.30), 2);
  r.market_revpar := round(own_revpar * (0.85 + random()::numeric * 0.30), 2);

  -- Guest ------------------------------------------------------------------
  r.nps := round((case segment
    when 'luxury'         then 55 + random()::numeric * 20
    when 'upper_upscale'  then 45 + random()::numeric * 20
    when 'upscale'        then 35 + random()::numeric * 20
    when 'upper_midscale' then 25 + random()::numeric * 20
    else                       20 + random()::numeric * 20
  end)::numeric, 1);
  r.csat := round((3.6 + random()::numeric * 1.2)::numeric, 2);
  r.repeat_guest_pct := round((15 + random()::numeric * 30)::numeric, 2);
  r.rooms_cleaned := round(rooms_sold * (0.95 + random()::numeric * 0.10))::int;
  r.housekeeping_hours := round(r.rooms_cleaned / (1.6 + random()::numeric * 0.7), 2);

  return r;
end;
$$;

revoke execute on function public.synth_metric_extras(int, int, numeric, text, date)
  from public, anon, authenticated;

comment on function public.synth_metric_extras(int, int, numeric, text, date) is
  'Synthesises segment-realistic distribution, cost, market, and guest metrics for one property-day.';

-- ---------------------------------------------------------------------------
-- d. generator (same signature; pg_cron job unchanged)
-- ---------------------------------------------------------------------------
create or replace function public.generate_daily_hotel_metrics(target_date date default current_date)
returns void
language plpgsql
set search_path = public
as $$
declare
  p record;
  occ numeric;
  adr_v numeric;
  sold int;
  rev numeric;
  x public.metric_extras;
  is_weekend boolean := extract(isodow from target_date) in (5, 6);  -- Fri/Sat nights
begin
  for p in select id, total_rooms, segment, base_adr from public.properties loop
    if p.segment = 'luxury' then
      occ := case when is_weekend then 80 + random()::numeric * 16 else 60 + random()::numeric * 25 end;
    elsif p.segment = 'midscale' then
      occ := case when is_weekend then 70 + random()::numeric * 20 else 55 + random()::numeric * 25 end;
    else
      occ := case when is_weekend then 75 + random()::numeric * 20 else 60 + random()::numeric * 25 end;
    end if;
    occ := round(occ, 2);
    adr_v := p.base_adr * (0.85 + random()::numeric * 0.30) * (case when is_weekend then 1.10 else 1 end);
    adr_v := round(adr_v, 2);
    sold := floor(p.total_rooms * occ / 100)::int;
    rev := round(sold * adr_v, 2);
    x := public.synth_metric_extras(p.total_rooms, sold, rev, p.segment, target_date);

    insert into public.daily_metrics (
      property_id, metric_date, rooms_sold, total_revenue, occupancy_pct, revpar,
      bookings, direct_bookings, ota_bookings, gds_bookings, group_bookings, cancellations,
      avg_booking_window_days,
      rooms_cost, fnb_cost, admin_cost, marketing_cost, maintenance_cost, utilities_cost,
      market_occupancy_pct, market_adr, market_revpar,
      nps, csat, repeat_guest_pct, rooms_cleaned, housekeeping_hours
    ) values (
      p.id, target_date, sold, rev, occ, round(rev / p.total_rooms, 2),
      x.bookings, x.direct_bookings, x.ota_bookings, x.gds_bookings, x.group_bookings, x.cancellations,
      x.avg_booking_window_days,
      x.rooms_cost, x.fnb_cost, x.admin_cost, x.marketing_cost, x.maintenance_cost, x.utilities_cost,
      x.market_occupancy_pct, x.market_adr, x.market_revpar,
      x.nps, x.csat, x.repeat_guest_pct, x.rooms_cleaned, x.housekeeping_hours
    )
    on conflict (property_id, metric_date) do nothing;
  end loop;
end;
$$;

revoke execute on function public.generate_daily_hotel_metrics(date) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- e. backfill existing rows (rooms_sold / total_revenue / occupancy_pct / revpar untouched)
-- ---------------------------------------------------------------------------
update public.daily_metrics d
set bookings = e.bookings,
    direct_bookings = e.direct_bookings,
    ota_bookings = e.ota_bookings,
    gds_bookings = e.gds_bookings,
    group_bookings = e.group_bookings,
    cancellations = e.cancellations,
    avg_booking_window_days = e.avg_booking_window_days,
    rooms_cost = e.rooms_cost,
    fnb_cost = e.fnb_cost,
    admin_cost = e.admin_cost,
    marketing_cost = e.marketing_cost,
    maintenance_cost = e.maintenance_cost,
    utilities_cost = e.utilities_cost,
    market_occupancy_pct = e.market_occupancy_pct,
    market_adr = e.market_adr,
    market_revpar = e.market_revpar,
    nps = e.nps,
    csat = e.csat,
    repeat_guest_pct = e.repeat_guest_pct,
    rooms_cleaned = e.rooms_cleaned,
    housekeeping_hours = e.housekeeping_hours
from (
  select m.id, x.*
  from public.daily_metrics m
  join public.properties p on p.id = m.property_id
  cross join lateral public.synth_metric_extras(
    p.total_rooms, m.rooms_sold, m.total_revenue, p.segment, m.metric_date
  ) x
  where m.bookings = 0
) e
where d.id = e.id;

-- ---------------------------------------------------------------------------
-- f. 90-day history for hotels without rows (new hotels in prod)
-- ---------------------------------------------------------------------------
do $$
declare
  d date;
begin
  for d in select generate_series(current_date - 89, current_date, interval '1 day')::date loop
    perform public.generate_daily_hotel_metrics(d);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- g. portfolio_daily view
-- ---------------------------------------------------------------------------
create view public.portfolio_daily with (security_invoker = true) as
select
  m.metric_date,
  count(*)::int as properties,
  sum(p.total_rooms)::int as available_rooms,
  sum(m.rooms_sold)::int as rooms_sold,
  sum(m.total_revenue) as total_revenue,
  sum(m.total_cost) as total_cost,
  sum(m.gop) as gop,
  sum(m.bookings)::int as bookings,
  sum(m.direct_bookings)::int as direct_bookings,
  sum(m.cancellations)::int as cancellations,
  round(sum(m.avg_booking_window_days * m.bookings) / nullif(sum(m.bookings), 0), 1)
    as avg_booking_window_days,
  round(sum(m.market_occupancy_pct * p.total_rooms) / nullif(sum(p.total_rooms), 0), 2)
    as market_occupancy_pct,
  round(sum(m.market_adr * m.rooms_sold) / nullif(sum(m.rooms_sold), 0), 2) as market_adr,
  round(sum(m.market_revpar * p.total_rooms) / nullif(sum(p.total_rooms), 0), 2) as market_revpar,
  round(sum(m.nps * m.rooms_sold) / nullif(sum(m.rooms_sold), 0), 1) as nps,
  round(sum(m.csat * m.rooms_sold) / nullif(sum(m.rooms_sold), 0), 2) as csat,
  round(sum(m.repeat_guest_pct * m.rooms_sold) / nullif(sum(m.rooms_sold), 0), 2)
    as repeat_guest_pct,
  sum(m.rooms_cleaned)::int as rooms_cleaned,
  sum(m.housekeeping_hours) as housekeeping_hours
from public.daily_metrics m
join public.properties p on p.id = m.property_id
group by m.metric_date;

grant select on public.portfolio_daily to anon, authenticated, analytics_ro;

-- ---------------------------------------------------------------------------
-- h. comments
-- ---------------------------------------------------------------------------
comment on view public.portfolio_daily is
  'Per-day portfolio rollup across all properties (sums plus weighted averages); frontend KPI source.';
