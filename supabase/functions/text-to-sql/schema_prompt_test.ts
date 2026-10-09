import { CHARTS, METRIC_COLUMNS, SYSTEM_PROMPT } from "./schema_prompt.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

Deno.test("every metric column appears in the system prompt", () => {
  for (const col of METRIC_COLUMNS) {
    assert(SYSTEM_PROMPT.includes(col), `missing column in prompt: ${col}`);
  }
});

Deno.test("prompt retains SQL formatting rules", () => {
  assert(SYSTEM_PROMPT.includes("semicolon"), "missing semicolon rule");
  assert(SYSTEM_PROMPT.includes("double quotes"), "missing double quotes rule");
});

Deno.test("CHARTS is bar, line, kpi, table", () => {
  assert(
    JSON.stringify(CHARTS) === JSON.stringify(["bar", "line", "kpi", "table"]),
    `unexpected CHARTS: ${JSON.stringify(CHARTS)}`,
  );
});
