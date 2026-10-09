import {
  columnRoles,
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatPercent,
  isDateLike,
  isNumeric,
  isPercentLikeKey,
  monthLabel,
  toNumber,
} from "../components/charts/format";
import type { QueryResult } from "./api";

export type MetricUnit = "currency" | "percent" | "number";
export type ColorKey = "revenue" | "adr" | "revpar" | "occupancy";

export type MetricSeries = {
  key: string;
  title: string;
  note: string;
  labels: string[];
  values: number[];
  color: ColorKey;
  partialLast: boolean;
  projection: number | null;
  unit: MetricUnit;
};

export type MappedResult = {
  summary: string;
  charts: MetricSeries[];
  table: { columns: string[]; rows: Record<string, unknown>[] } | null;
};

const COLORS: ColorKey[] = ["revenue", "adr", "revpar", "occupancy"];

function colorFor(key: string, i: number): ColorKey {
  if (/revpar/i.test(key)) return "revpar";
  if (/occ/i.test(key)) return "occupancy";
  if (/adr|rate/i.test(key)) return "adr";
  if (/revenue/i.test(key)) return "revenue";
  return COLORS[i % COLORS.length];
}

function unitFor(key: string): MetricUnit {
  if (isPercentLikeKey(key)) return "percent";
  if (/revenue|adr|revpar|price|cost|income/i.test(key)) return "currency";
  return "number";
}

export function formatByUnit(v: number, unit: MetricUnit): string {
  if (unit === "percent") return formatPercent(v);
  if (unit === "currency") return Math.abs(v) >= 1000 ? formatCompactCurrency(v) : formatCurrency(v);
  return formatNumber(v);
}

const titleCase = (k: string) =>
  k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function mapResult(result: QueryResult, now: Date = new Date()): MappedResult {
  const { rows, chart, title } = result;
  const empty = { summary: title, charts: [], table: null };
  if (rows.length === 0) return empty;

  if (chart === "kpi") {
    if (rows.length !== 1) return empty;
    const row = rows[0];
    const k = Object.keys(row).find((c) => isNumeric(row[c]) && !isDateLike(row[c]));
    const summary =
      k === undefined ? title : `${title}: ${formatByUnit(toNumber(row[k]), unitFor(k))}`;
    return { summary, charts: [], table: null };
  }

  const tableOf = () => ({ columns: Object.keys(rows[0]), rows });

  // Time series is decided by data shape, not the LLM's chart hint: a date-like x
  // column with 2+ rows renders one bar chart per metric (README "How results map").
  const { xKey, yKeys } = columnRoles(rows);
  const xs = rows.map((r) => String(r[xKey] ?? ""));
  const dated = xs.every(isDateLike);
  if ((chart === "line" || dated) && rows.length > 1) {
    if (yKeys.length === 0) return { summary: title, charts: [], table: tableOf() };
    const monthly = dated && xs.every((x) => x.slice(8, 10) === "01");
    const labels = xs.map((x) =>
      monthly ? monthLabel(x) : dated ? `${x.slice(5, 7)}/${x.slice(8, 10)}` : x,
    );
    const curYm = now.toISOString().slice(0, 7);
    const partialLast = monthly && xs[xs.length - 1].slice(0, 7) === curYm;
    const dim = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
    const charts = yKeys.map((key, i): MetricSeries => {
      const values = rows.map((r) => (r[key] == null ? 0 : toNumber(r[key])));
      const unit = unitFor(key);
      const projection =
        partialLast && /revenue/i.test(key)
          ? (values[values.length - 1] / Math.max(1, now.getUTCDate())) * dim
          : null;
      return {
        key,
        title: titleCase(key),
        note: partialLast ? `${monthLabel(xs[xs.length - 1])} MTD` : unit,
        labels,
        values,
        color: colorFor(key, i),
        partialLast,
        projection,
        unit,
      };
    });
    return { summary: title, charts, table: null };
  }

  return { summary: title, charts: [], table: tableOf() };
}
