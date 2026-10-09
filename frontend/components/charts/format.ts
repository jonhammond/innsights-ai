type Row = Record<string, unknown>;

const NUM_RE = /^-?\d+(\.\d+)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

export function isNumeric(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string") return NUM_RE.test(v.trim());
  return false;
}

export function toNumber(v: unknown): number {
  return typeof v === "number" ? v : Number(v);
}

export function isDateLike(v: unknown): boolean {
  return typeof v === "string" && DATE_RE.test(v);
}

export function formatNumber(v: unknown): string {
  if (!isNumeric(v)) return String(v ?? "");
  return toNumber(v).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function formatDateTick(v: unknown): string {
  const s = String(v);
  return isDateLike(s) ? `${s.slice(5, 7)}/${s.slice(8, 10)}` : s;
}

export function columnRoles(rows: Row[]): { xKey: string; yKeys: string[] } {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const numericCol = (k: string) =>
    rows.every((r) => r[k] == null || (isNumeric(r[k]) && !isDateLike(r[k])));
  const xKey =
    cols.find((k) => !numericCol(k) || rows.every((r) => isDateLike(r[k]))) ??
    cols[0] ??
    "";
  const yKeys = cols.filter((k) => k !== xKey && numericCol(k));
  return { xKey, yKeys };
}

export function humanize(key: string): string {
  return key.replace(/_/g, " ");
}
