import { validateSql } from "./sql_guard.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

Deno.test("accepts select and with", () => {
  assert(validateSql("  SELECT 1").ok, "select");
  assert(validateSql("with a as (select 1) select * from a").ok, "with");
});

Deno.test("allows metric columns that resemble denied names", () => {
  // Column/alias names must not trip the prefix deny-list.
  assert(validateSql("select rooms_cost, csat from daily_metrics").ok, "cost");
  assert(validateSql("select location, total_rooms from properties").ok, "loc");
});

Deno.test("rejects unsafe sql", () => {
  const bad = [
    "DROP TABLE properties",
    "select 1; drop table properties",
    'select "Name" from properties',
    "select U&'\\0041'",
    "selectx 1",
    "update properties set name='x'",
    "select current_setting('request.headers', true)",
    "select pg_catalog.current_setting('request.jwt.claims')",
    "select name, setting from pg_settings",
    "select * from vault.decrypted_secrets",
    "select set_config('role', 'postgres', true)",
    "select query_to_xml('select 1', true, false, '')",
    "select pg_sleep(10)",
    "",
    42,
  ];
  for (const b of bad) {
    assert(!validateSql(b).ok, `should reject: ${String(b)}`);
  }
});
