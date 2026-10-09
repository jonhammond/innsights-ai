import { Platform } from "react-native";

function quote(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(rows: Record<string, unknown>[], filename: string): void {
  if (Platform.OS !== "web" || typeof document === "undefined" || rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const lines = [cols.map(quote).join(",")];
  for (const r of rows) lines.push(cols.map((c) => quote(r[c])).join(","));
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
