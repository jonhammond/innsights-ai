-- Edge Function (service_role) writes one ai_query_log row per accepted
-- request and the rate-limit helper reads; RLS bypass does not replace
-- table privileges, so explicit grants are required.
grant select, insert on public.ai_query_log to service_role;
