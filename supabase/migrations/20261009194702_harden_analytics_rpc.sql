-- Harden run_hotel_analytics against request-context disclosure.
--
-- PostgREST publishes the caller's headers, cookies and JWT claims as
-- transaction-local settings (request.headers, request.cookies,
-- request.jwt.claims). SET LOCAL ROLE does not clear them, so a generated
-- query calling current_setting('request.headers', true) would return the
-- service_role token that the Edge Function used to invoke this RPC.
-- Fix: scrub those settings before dropping privileges and deny the
-- settings-reading functions and catalogs outright.

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
  -- textual checks. current_setting / pg_settings and friends read the
  -- request context and server configuration; vault holds secrets. The rest
  -- are file/network/signal functions with no analytics use. Prefix matching
  -- (no trailing boundary) so variants like table_to_xml_and_xmlschema or
  -- pg_ls_waldir are covered.
  if q ~* '\m(set_config|current_setting|pg_settings|pg_show_all_settings|pg_file_settings|pg_stat_activity|pg_stat_ssl|vault|decrypted_secrets|query_to_xml|query_to_json|table_to_xml|schema_to_xml|database_to_xml|cursor_to_xml|xmltable|ts_stat|ts_rewrite|crosstab|connectby|dblink|pg_sleep|pg_read|pg_ls|pg_stat_file|lo_|pg_terminate_backend|pg_cancel_backend|pg_reload_conf|pg_logical)' then
    raise exception 'query references a disallowed function';
  end if;

  -- Scrub the PostgREST request context for the rest of the transaction so
  -- nothing executed below can read the caller's credentials, even if the
  -- deny-list above is ever bypassed.
  perform set_config('request.headers', '', true);
  perform set_config('request.cookies', '', true);
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt', '', true);

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
