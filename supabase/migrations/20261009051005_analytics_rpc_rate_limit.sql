do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'analytics_ro') then
    create role analytics_ro nologin;
  end if;
end;
$$;

grant usage on schema public to analytics_ro;
grant select on public.properties, public.daily_metrics to analytics_ro;

-- RLS is enabled on both tables, so analytics_ro needs explicit SELECT policies.
create policy "properties readable by analytics_ro" on public.properties
  for select to analytics_ro using (true);
create policy "daily_metrics readable by analytics_ro" on public.daily_metrics
  for select to analytics_ro using (true);

-- Callers (service_role) must be able to SET ROLE analytics_ro.
grant analytics_ro to service_role;

create or replace function public.run_hotel_analytics(sql_query text)
returns jsonb
language plpgsql
security invoker  -- SET ROLE is forbidden inside SECURITY DEFINER functions
set search_path = public
as $$
declare
  q text := btrim(sql_query);
  result jsonb;
begin
  if q is null or q = '' then
    raise exception 'empty query';
  end if;
  if position(';' in q) > 0 then
    raise exception 'semicolons are not allowed';
  end if;
  if q !~* '^(select|with)([[:space:]]|\(|$)' then
    raise exception 'only SELECT or WITH queries are allowed';
  end if;
  -- Quoted and Unicode-escaped identifiers (e.g. u&"s\0065t_config") could
  -- spell a denied function name in a form the regex below never sees. The
  -- schema is all lowercase, so legitimate queries never need them.
  if position('"' in q) > 0 or q ~* 'u&' then
    raise exception 'quoted or unicode-escaped identifiers are not allowed';
  end if;
  -- Deny-list: set_config('role', ...) would undo SET LOCAL ROLE (SET ROLE
  -- permission follows the session user, not the current role), and the
  -- *_to_xml/json family executes a second SQL string that would bypass these
  -- textual checks. The rest are file/network/signal functions with no
  -- analytics use. Prefix matching (no trailing boundary) so variants like
  -- table_to_xml_and_xmlschema or pg_ls_waldir are covered.
  if q ~* '\m(set_config|query_to_xml|query_to_json|table_to_xml|schema_to_xml|database_to_xml|cursor_to_xml|xmltable|ts_stat|ts_rewrite|crosstab|connectby|dblink|pg_sleep|pg_read|pg_ls|pg_stat_file|lo_|pg_terminate_backend|pg_cancel_backend|pg_reload_conf|pg_logical)' then
    raise exception 'query references a disallowed function';
  end if;

  set local role analytics_ro;
  -- Backstop if the role sandbox is ever escaped: once queries have run in a
  -- read-only transaction, it cannot be switched back to read-write.
  set local transaction_read_only = on;
  set local statement_timeout = '5s';  -- NOTE: only affects subsequent top-level statements in the txn, not this call; caller must enforce its own timeout

  execute format('select jsonb_agg(t) from (select * from (%s) q limit 500) t', q)
    into result;

  -- Escape detection: if the query somehow undid SET LOCAL ROLE despite the
  -- checks above, abort so the transaction rolls back.
  if current_user <> 'analytics_ro' then
    raise exception 'role escape detected';
  end if;

  return coalesce(result, '[]'::jsonb);
end;
$$;

revoke execute on function public.run_hotel_analytics(text) from public, anon, authenticated;
grant execute on function public.run_hotel_analytics(text) to service_role;

create table public.ai_query_log (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index ai_query_log_ip_hash_created_at_idx
  on public.ai_query_log (ip_hash, created_at);

alter table public.ai_query_log enable row level security;
-- No policies: anon/authenticated denied; service_role bypasses RLS.
revoke all on public.ai_query_log from anon, authenticated;

create or replace function public.count_recent_queries(p_ip_hash text)
returns int
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
  from public.ai_query_log
  where ip_hash = p_ip_hash
    and created_at > now() - interval '1 hour';
$$;

revoke execute on function public.count_recent_queries(text) from public, anon, authenticated;
grant execute on function public.count_recent_queries(text) to service_role;
