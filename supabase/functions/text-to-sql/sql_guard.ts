// Defense-in-depth SQL validation. Mirrors checks in public.run_hotel_analytics.
// The RPC remains the authoritative enforcement point.

export type SqlCheck = { ok: true; sql: string } | {
  ok: false;
  reason: string;
};

export function validateSql(raw: unknown): SqlCheck {
  if (typeof raw !== "string") {
    return { ok: false, reason: "SQL is not a string" };
  }
  const sql = raw.trim();
  if (!sql) return { ok: false, reason: "SQL is empty" };
  if (sql.length > 4000) {
    return { ok: false, reason: "SQL exceeds maximum length" };
  }
  if (!/^(select|with)\b/i.test(sql)) {
    return { ok: false, reason: "Only SELECT/WITH statements are allowed" };
  }
  if (sql.includes(";")) {
    return { ok: false, reason: "Semicolons are not allowed" };
  }
  if (sql.includes('"')) {
    return { ok: false, reason: "Double-quoted identifiers are not allowed" };
  }
  if (/u&/i.test(sql)) {
    return { ok: false, reason: "Unicode escapes are not allowed" };
  }
  return { ok: true, sql };
}
