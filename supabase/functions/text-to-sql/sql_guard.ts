// Defense-in-depth SQL validation. Mirrors checks in public.run_hotel_analytics.
// The RPC remains the authoritative enforcement point.

export type SqlCheck = { ok: true; sql: string } | {
  ok: false;
  reason: string;
};

// Mirrors the RPC deny-list: functions that read the request context or
// server settings, execute a second SQL string, or touch files/network.
// Prefix match (no trailing boundary) so table_to_xml_and_xmlschema etc. hit.
const DENIED = new RegExp(
  "\\b(" + [
    "set_config",
    "current_setting",
    "pg_settings",
    "pg_show_all_settings",
    "pg_file_settings",
    "pg_stat_activity",
    "pg_stat_ssl",
    "vault",
    "decrypted_secrets",
    "query_to_xml",
    "query_to_json",
    "table_to_xml",
    "schema_to_xml",
    "database_to_xml",
    "cursor_to_xml",
    "xmltable",
    "ts_stat",
    "ts_rewrite",
    "crosstab",
    "connectby",
    "dblink",
    "pg_sleep",
    "pg_read",
    "pg_ls",
    "pg_stat_file",
    "lo_",
    "pg_terminate_backend",
    "pg_cancel_backend",
    "pg_reload_conf",
    "pg_logical",
  ].join("|") + ")",
  "i",
);

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
  if (DENIED.test(sql)) {
    return { ok: false, reason: "Query references a disallowed function" };
  }
  return { ok: true, sql };
}
