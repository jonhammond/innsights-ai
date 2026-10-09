-- Replace real-brand-derived property names with fictional ones.
-- Idempotent: fresh databases already seed the new names, so this matches zero rows.
-- daily_metrics references property_id, so history is preserved.

update public.properties p
set name = v.new_name
from (values
  ('Grand Hyatt Downtown',  'Meridian Grand Downtown'),
  ('The Ritz Waterfront',   'The Marlowe Waterfront'),
  ('Courtyard Tech Center', 'Larkspur Tech Center')
) as v (old_name, new_name)
where p.name = v.old_name;
