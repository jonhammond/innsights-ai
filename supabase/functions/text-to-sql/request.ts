// Pure request helpers (no Request/Deno deps) for the text-to-sql function.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PROPERTY_IDS = 50;
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export function parsePropertyIds(value: unknown): string[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) {
    throw new Error("property_ids must be an array of UUID strings");
  }
  if (value.length > MAX_PROPERTY_IDS) {
    throw new Error(
      `property_ids must contain at most ${MAX_PROPERTY_IDS} entries`,
    );
  }
  const seen = new Set<string>();
  for (const v of value) {
    if (typeof v !== "string" || !UUID_RE.test(v)) {
      throw new Error("property_ids must contain only valid UUID strings");
    }
    seen.add(v.toLowerCase());
  }
  return [...seen];
}

export function scopePrompt(prompt: string, ids: string[] | null): string {
  if (ids === null) return prompt;
  const list = (ids.length ? ids : [NIL_UUID]).map((id) => `'${id}'`).join(
    ", ",
  );
  const suffix = ids.length
    ? " Add this filter to every query via daily_metrics.property_id or properties.id."
    : "";
  return `${prompt}\n\nRestrict results to properties whose id is in (${list}).${suffix}`;
}
