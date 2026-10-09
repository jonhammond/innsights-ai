insert into public.properties (name, location, total_rooms) values
  ('Grand Hyatt Downtown', 'Denver, CO', 350),
  ('The Ritz Waterfront', 'Miami, FL', 200),
  ('Courtyard Tech Center', 'Austin, TX', 150);

do $$
declare
  d date;
begin
  for d in select generate_series(current_date - 89, current_date, interval '1 day')::date loop
    perform public.generate_daily_hotel_metrics(d);
  end loop;
end;
$$;
