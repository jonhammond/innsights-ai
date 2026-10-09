import { parsePropertyIds, scopePrompt } from "./request.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function throws(fn: () => unknown): boolean {
  try {
    fn();
  } catch (e) {
    return e instanceof Error && e.message.length > 0;
  }
  return false;
}

const A = "11111111-2222-3333-4444-555555555555";
const B = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

Deno.test("parsePropertyIds returns null for undefined/null", () => {
  assert(parsePropertyIds(undefined) === null, "undefined");
  assert(parsePropertyIds(null) === null, "null");
});

Deno.test("parsePropertyIds accepts valid lists and empty array", () => {
  assert(
    JSON.stringify(parsePropertyIds([A, B])) === JSON.stringify([A, B]),
    "list",
  );
  assert(JSON.stringify(parsePropertyIds([])) === "[]", "empty");
});

Deno.test("parsePropertyIds dedupes and lowercases", () => {
  const out = parsePropertyIds([B.toUpperCase(), A, B, A.toUpperCase()]);
  assert(
    JSON.stringify(out) === JSON.stringify([B, A]),
    `got ${JSON.stringify(out)}`,
  );
});

Deno.test("parsePropertyIds rejects invalid input", () => {
  assert(throws(() => parsePropertyIds("x")), "non-array string");
  assert(throws(() => parsePropertyIds({})), "non-array object");
  assert(throws(() => parsePropertyIds([A, 1])), "non-string element");
  assert(throws(() => parsePropertyIds([null])), "null element");
  assert(throws(() => parsePropertyIds(["not-a-uuid"])), "bad uuid");
  assert(throws(() => parsePropertyIds([`${A}'; drop table x`])), "injection");
  const many = Array.from(
    { length: 51 },
    (_, i) => `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
  );
  assert(throws(() => parsePropertyIds(many)), ">50");
  assert(parsePropertyIds(many.slice(0, 50))?.length === 50, "50 ok");
});

Deno.test("scopePrompt passes through when ids is null", () => {
  assert(scopePrompt("hello", null) === "hello", "passthrough");
});

Deno.test("scopePrompt appends restriction with single quotes only", () => {
  const out = scopePrompt("hello", [A, B]);
  assert(out.startsWith("hello\n\nRestrict results"), "prefix");
  assert(out.includes(`in ('${A}', '${B}').`), "id list");
  assert(
    out.includes("daily_metrics.property_id or properties.id"),
    "filter hint",
  );
  assert(!out.includes('"'), "no double quotes");
});

Deno.test("scopePrompt empty array restricts to nil UUID", () => {
  const out = scopePrompt("hello", []);
  assert(
    out ===
      "hello\n\nRestrict results to properties whose id is in ('00000000-0000-0000-0000-000000000000').",
    `got ${out}`,
  );
});
