insert into public.properties (name, location, total_rooms, segment, base_adr, market) values
  ('Meridian Grand Downtown', 'Denver, CO', 350, 'upper_upscale', 250, 'Denver'),
  ('The Marlowe Waterfront', 'Miami, FL', 200, 'luxury', 450, 'Miami'),
  ('Larkspur Tech Center', 'Austin, TX', 150, 'upscale', 160, 'Austin')
on conflict (name) do nothing;

do $$
declare
  d date;
begin
  for d in select generate_series(current_date - 89, current_date, interval '1 day')::date loop
    perform public.generate_daily_hotel_metrics(d);
  end loop;
end;
$$;
