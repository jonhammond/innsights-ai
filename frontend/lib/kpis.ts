import { monthLabel } from "../components/charts/format";
import { supabase } from "./supabase";

export type MonthStats = {
  label: string;
  year: number;
  revenue: number;
  adr: number | null;
  occupancyPct: number | null;
  revpar: number | null;
  series: { revenue: number[]; adr: number[]; occupancy: number[]; revpar: number[] };
};

export type KpiSnapshot = {
  closedMonth: MonthStats;
  priorMonth: (MonthStats & { complete: boolean }) | null;
  portfolio: { propertyCount: number; totalRooms: number };
};

export type PropertyRow = { id: string | number; total_rooms: number | string };
export type MetricRow = {
  property_id: string | number;
  metric_date: string;
  rooms_sold: number | string;
  total_revenue: number | string;
};

type Bucket = { dates: Set<string>; rev: number; sold: number; avail: number };

const div = (a: number, b: number): number | null => (b > 0 ? a / b : null);
const daysInMonth = (y: number, m0: number) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
const key = (y: number, m0: number) => `${y}-${String(m0 + 1).padStart(2, "0")}`;

function stats(rows: MetricRow[], rooms: Map<string, number>, ym: string, y: number): MonthStats {
  const inMonth = rows.filter((r) => r.metric_date.slice(0, 7) === ym);
  const b: Bucket = { dates: new Set(), rev: 0, sold: 0, avail: 0 };
  const daily = new Map<string, Bucket>();
  for (const r of inMonth) {
    const rm = rooms.get(String(r.property_id)) ?? 0;
    const rev = Number(r.total_revenue);
    const sold = Number(r.rooms_sold);
    b.dates.add(r.metric_date);
    b.rev += rev;
    b.sold += sold;
    b.avail += rm;
    const d = daily.get(r.metric_date) ?? { dates: new Set(), rev: 0, sold: 0, avail: 0 };
    d.rev += rev;
    d.sold += sold;
    d.avail += rm;
    daily.set(r.metric_date, d);
  }
  const series: MonthStats["series"] = { revenue: [], adr: [], occupancy: [], revpar: [] };
  for (const date of [...daily.keys()].sort()) {
    const d = daily.get(date)!;
    series.revenue.push(d.rev);
    series.adr.push(div(d.rev, d.sold) ?? 0);
    series.occupancy.push((div(d.sold, d.avail) ?? 0) * 100);
    series.revpar.push(div(d.rev, d.avail) ?? 0);
  }
  const occ = div(b.sold, b.avail);
  return {
    label: monthLabel(`${ym}-01`),
    year: y,
    revenue: b.rev,
    adr: div(b.rev, b.sold),
    occupancyPct: occ == null ? null : occ * 100,
    revpar: div(b.rev, b.avail),
    series,
  };
}

export function aggregateKpis(
  rows: MetricRow[],
  properties: PropertyRow[],
  now: Date,
): KpiSnapshot | null {
  if (rows.length === 0 || properties.length === 0) return null;
  const rooms = new Map(properties.map((p) => [String(p.id), Number(p.total_rooms)]));
  const dayCount = new Map<string, Set<string>>();
  for (const r of rows) {
    const ym = r.metric_date.slice(0, 7);
    if (!dayCount.has(ym)) dayCount.set(ym, new Set());
    dayCount.get(ym)!.add(r.metric_date);
  }
  const monthAt = (offset: number) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    return { y: d.getUTCFullYear(), m0: d.getUTCMonth() };
  };
  const isComplete = (y: number, m0: number) =>
    (dayCount.get(key(y, m0))?.size ?? 0) === daysInMonth(y, m0);

  // Closed month: previous month if fully populated, else step back (max 2 steps). Never the current month.
  let offset = 0;
  for (let o = 1; o <= 3; o++) {
    const { y, m0 } = monthAt(o);
    if (isComplete(y, m0)) {
      offset = o;
      break;
    }
  }
  if (offset === 0) return null;
  const c = monthAt(offset);
  const p = monthAt(offset + 1);
  const closed = stats(rows, rooms, key(c.y, c.m0), c.y);
  const priorHas = (dayCount.get(key(p.y, p.m0))?.size ?? 0) > 0;
  const prior = priorHas
    ? { ...stats(rows, rooms, key(p.y, p.m0), p.y), complete: isComplete(p.y, p.m0) }
    : null;
  return {
    closedMonth: closed,
    priorMonth: prior,
    portfolio: {
      propertyCount: properties.length,
      totalRooms: [...rooms.values()].reduce((a, b) => a + b, 0),
    },
  };
}

/** Deltas vs. prior month; null when prior month is absent/incomplete. Percent for revenue/ADR/RevPAR, points for occupancy. */
export function kpiDeltas(s: KpiSnapshot) {
  const p = s.priorMonth;
  if (!p || !p.complete) return null;
  const c = s.closedMonth;
  const pct = (a: number | null, b: number | null) =>
    a == null || b == null || b === 0 ? null : ((a - b) / b) * 100;
  return {
    revenue: pct(c.revenue, p.revenue),
    adr: pct(c.adr, p.adr),
    revpar: pct(c.revpar, p.revpar),
    occupancyPts:
      c.occupancyPct == null || p.occupancyPct == null ? null : c.occupancyPct - p.occupancyPct,
  };
}

export async function fetchKpis(now: Date = new Date()): Promise<KpiSnapshot | null> {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1))
    .toISOString()
    .slice(0, 10);
  const [props, metrics] = await Promise.all([
    supabase.from("properties").select("id,total_rooms"),
    supabase
      .from("daily_metrics")
      .select("property_id,metric_date,rooms_sold,total_revenue")
      .gte("metric_date", from)
      .order("metric_date", { ascending: true })
      .limit(1000),
  ]);
  if (props.error) throw props.error;
  if (metrics.error) throw metrics.error;
  return aggregateKpis(
    (metrics.data ?? []) as MetricRow[],
    (props.data ?? []) as PropertyRow[],
    now,
  );
}
