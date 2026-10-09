import { validateSql } from "./sql_guard.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

Deno.test("accepts select and with", () => {
  assert(validateSql("  SELECT 1").ok, "select");
  assert(validateSql("with a as (select 1) select * from a").ok, "with");
});

Deno.test("rejects unsafe sql", () => {
  const bad = [
    "DROP TABLE properties",
    "select 1; drop table properties",
    'select "Name" from properties',
    "select U&'\\0041'",
    "selectx 1",
    "update properties set name='x'",
    "",
    42,
  ];
  for (const b of bad) {
    assert(!validateSql(b).ok, `should reject: ${String(b)}`);
  }
});
