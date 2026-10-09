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
  is_weekend boolean := extract(isodow from target_date) in (5, 6);  -- Fri/Sat nights
begin
  for p in select id, total_rooms from public.properties loop
    -- weekends 75-95, weekdays 60-85
    if is_weekend then
      occ := 75 + random() * 20;
    else
      occ := 60 + random() * 25;
    end if;
    occ := round(occ, 2);
    adr_v := round((140 + random() * 110)::numeric, 2);
    sold := floor(p.total_rooms * occ / 100)::int;
    rev := round(sold * adr_v, 2);

    insert into public.daily_metrics
      (property_id, metric_date, rooms_sold, total_revenue, occupancy_pct, revpar)
    values
      (p.id, target_date, sold, rev, occ, round(rev / p.total_rooms, 2))
    on conflict (property_id, metric_date) do nothing;
  end loop;
end;
$$;

revoke execute on function public.generate_daily_hotel_metrics(date) from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule(
    'generate-daily-hotel-data',
    '0 0 * * *',
    'select public.generate_daily_hotel_metrics();'
  );
exception when others then
  raise notice 'pg_cron unavailable, skipping schedule: %', sqlerrm;
end;
$$;
