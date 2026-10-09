import { monthLabel } from "../components/charts/format";
import { supabase } from "./supabase";

export type SeriesKey =
  | "revenue"
  | "adr"
  | "occupancy"
  | "revpar"
  | "bookings"
  | "directBookingPct"
  | "cancellationPct"
  | "bookingWindowDays"
  | "totalCost"
  | "gop"
  | "cpor"
  | "mpi"
  | "ari"
  | "rgi"
  | "nps"
  | "csat"
  | "repeatGuestPct"
  | "hkRoomsPerHour";

export type MonthStats = {
  label: string;
  year: number;
  revenue: number;
  adr: number | null;
  occupancyPct: number | null;
  revpar: number | null;
  bookings: number;
  directBookingPct: number | null;
  cancellationPct: number | null;
  bookingWindowDays: number | null;
  totalCost: number;
  gop: number;
  cpor: number | null;
  mpi: number | null;
  ari: number | null;
  rgi: number | null;
  nps: number | null;
  csat: number | null;
  repeatGuestPct: number | null;
  hkRoomsPerHour: number | null;
  series: Record<SeriesKey, number[]>;
};

export type KpiSnapshot = {
  closedMonth: MonthStats;
  priorMonth: (MonthStats & { complete: boolean }) | null;
  flowThroughPct: number | null;
  portfolio: { propertyCount: number; totalRooms: number };
};

/** One `portfolio_daily` row; numerics may arrive as strings (PostgREST numeric). */
export type PortfolioDailyRow = {
  metric_date: string;
  properties: number | string | null;
  available_rooms: number | string | null;
  rooms_sold: number | string | null;
  total_revenue: number | string | null;
  total_cost: number | string | null;
  gop: number | string | null;
  bookings: number | string | null;
  direct_bookings: number | string | null;
  cancellations: number | string | null;
  avg_booking_window_days: number | string | null;
  market_occupancy_pct: number | string | null;
  market_adr: number | string | null;
  market_revpar: number | string | null;
  nps: number | string | null;
  csat: number | string | null;
  repeat_guest_pct: number | string | null;
  rooms_cleaned: number | string | null;
  housekeeping_hours: number | string | null;
};

type Day = {
  date: string;
  properties: number;
  avail: number;
  sold: number;
  rev: number;
  cost: number;
  gop: number;
  bookings: number;
  direct: number;
  cancels: number;
  window: number | null;
  mktOcc: number | null;
  mktAdr: number | null;
  mktRevpar: number | null;
  nps: number | null;
  csat: number | null;
  repeat: number | null;
  cleaned: number;
  hkHours: number;
};

const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const n0 = (v: unknown) => num(v) ?? 0;

const toDay = (r: PortfolioDailyRow): Day => ({
  date: r.metric_date,
  properties: n0(r.properties),
  avail: n0(r.available_rooms),
  sold: n0(r.rooms_sold),
  rev: n0(r.total_revenue),
  cost: n0(r.total_cost),
  gop: n0(r.gop),
  bookings: n0(r.bookings),
  direct: n0(r.direct_bookings),
  cancels: n0(r.cancellations),
  window: num(r.avg_booking_window_days),
  mktOcc: num(r.market_occupancy_pct),
  mktAdr: num(r.market_adr),
  mktRevpar: num(r.market_revpar),
  nps: num(r.nps),
  csat: num(r.csat),
  repeat: num(r.repeat_guest_pct),
  cleaned: n0(r.rooms_cleaned),
  hkHours: n0(r.housekeeping_hours),
});

const div = (a: number, b: number): number | null => (b > 0 ? a / b : null);
const ratio = (a: number | null, b: number | null, k = 1): number | null =>
  a == null || b == null || b <= 0 ? null : (a / b) * k;
const sum = (days: Day[], f: (d: Day) => number) => days.reduce((a, d) => a + f(d), 0);

function wmean(days: Day[], val: (d: Day) => number | null, w: (d: Day) => number): number | null {
  let s = 0;
  let ws = 0;
  for (const d of days) {
    const v = val(d);
    const wt = w(d);
    if (v == null || !(wt > 0)) continue;
    s += v * wt;
    ws += wt;
  }
  return ws > 0 ? s / ws : null;
}

const pctOf = (a: number, b: number) => {
  const q = div(a, b);
  return q == null ? null : q * 100;
};

const dailyFns: Record<SeriesKey, (d: Day) => number | null> = {
  revenue: (d) => d.rev,
  adr: (d) => div(d.rev, d.sold),
  occupancy: (d) => pctOf(d.sold, d.avail),
  revpar: (d) => div(d.rev, d.avail),
  bookings: (d) => d.bookings,
  directBookingPct: (d) => pctOf(d.direct, d.bookings),
  cancellationPct: (d) => pctOf(d.cancels, d.bookings),
  bookingWindowDays: (d) => d.window,
  totalCost: (d) => d.cost,
  gop: (d) => d.gop,
  cpor: (d) => div(d.cost, d.sold),
  mpi: (d) => ratio(pctOf(d.sold, d.avail), d.mktOcc, 100),
  ari: (d) => ratio(div(d.rev, d.sold), d.mktAdr, 100),
  rgi: (d) => ratio(div(d.rev, d.avail), d.mktRevpar, 100),
  nps: (d) => d.nps,
  csat: (d) => d.csat,
  repeatGuestPct: (d) => d.repeat,
  hkRoomsPerHour: (d) => div(d.cleaned, d.hkHours),
};
const SERIES_KEYS = Object.keys(dailyFns) as SeriesKey[];

const daysInMonth = (y: number, m0: number) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
const key = (y: number, m0: number) => `${y}-${String(m0 + 1).padStart(2, "0")}`;

function stats(all: Day[], ym: string, y: number): MonthStats {
  const days = all.filter((d) => d.date.slice(0, 7) === ym).sort((a, b) => a.date.localeCompare(b.date));
  const series = {} as Record<SeriesKey, number[]>;
  for (const k of SERIES_KEYS) series[k] = days.map((d) => dailyFns[k](d) ?? 0);

  const rev = sum(days, (d) => d.rev);
  const sold = sum(days, (d) => d.sold);
  const avail = sum(days, (d) => d.avail);
  const bookings = sum(days, (d) => d.bookings);
  const cost = sum(days, (d) => d.cost);
  const occ = pctOf(sold, avail);
  const adr = div(rev, sold);
  const revpar = div(rev, avail);
  const bySold = (d: Day) => d.sold;
  const byAvail = (d: Day) => d.avail;
  return {
    label: monthLabel(`${ym}-01`),
    year: y,
    revenue: rev,
    adr,
    occupancyPct: occ,
    revpar,
    bookings,
    directBookingPct: pctOf(sum(days, (d) => d.direct), bookings),
    cancellationPct: pctOf(sum(days, (d) => d.cancels), bookings),
    bookingWindowDays: wmean(days, (d) => d.window, (d) => d.bookings),
    totalCost: cost,
    gop: sum(days, (d) => d.gop),
    cpor: div(cost, sold),
    mpi: ratio(occ, wmean(days, (d) => d.mktOcc, byAvail), 100),
    ari: ratio(adr, wmean(days, (d) => d.mktAdr, bySold), 100),
    rgi: ratio(revpar, wmean(days, (d) => d.mktRevpar, byAvail), 100),
    nps: wmean(days, (d) => d.nps, bySold),
    csat: wmean(days, (d) => d.csat, bySold),
    repeatGuestPct: wmean(days, (d) => d.repeat, bySold),
    hkRoomsPerHour: div(sum(days, (d) => d.cleaned), sum(days, (d) => d.hkHours)),
    series,
  };
}

export function aggregateKpis(rows: PortfolioDailyRow[], now: Date): KpiSnapshot | null {
  if (rows.length === 0) return null;
  const days = rows.map(toDay);
  const dayCount = new Map<string, Set<string>>();
  for (const d of days) {
    const ym = d.date.slice(0, 7);
    if (!dayCount.has(ym)) dayCount.set(ym, new Set());
    dayCount.get(ym)!.add(d.date);
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
  const closed = stats(days, key(c.y, c.m0), c.y);
  const priorHas = (dayCount.get(key(p.y, p.m0))?.size ?? 0) > 0;
  const prior = priorHas
    ? { ...stats(days, key(p.y, p.m0), p.y), complete: isComplete(p.y, p.m0) }
    : null;
  const dRev = prior ? closed.revenue - prior.revenue : 0;
  const flowThroughPct =
    prior?.complete && Math.abs(dRev) >= 1 ? ((closed.gop - prior.gop) / dRev) * 100 : null;
  const latest = days.reduce((a, b) => (b.date > a.date ? b : a));
  return {
    closedMonth: closed,
    priorMonth: prior,
    flowThroughPct,
    portfolio: { propertyCount: latest.properties, totalRooms: latest.avail },
  };
}

/**
 * Deltas vs. prior month; null when prior month is absent/incomplete.
 * Percent change: revenue/adr/revpar/bookings/totalCost/gop/cpor/mpi/ari/rgi/hkRoomsPerHour.
 * Point difference: occupancyPts/directBookingPts/cancellationPts/repeatGuestPts.
 * Raw difference: nps/csat/bookingWindowDays.
 */
export function kpiDeltas(s: KpiSnapshot) {
  const p = s.priorMonth;
  if (!p || !p.complete) return null;
  const c = s.closedMonth;
  const pct = (a: number | null, b: number | null) =>
    a == null || b == null || b === 0 ? null : ((a - b) / b) * 100;
  const diff = (a: number | null, b: number | null) => (a == null || b == null ? null : a - b);
  return {
    revenue: pct(c.revenue, p.revenue),
    adr: pct(c.adr, p.adr),
    revpar: pct(c.revpar, p.revpar),
    occupancyPts: diff(c.occupancyPct, p.occupancyPct),
    bookings: pct(c.bookings, p.bookings),
    directBookingPts: diff(c.directBookingPct, p.directBookingPct),
    cancellationPts: diff(c.cancellationPct, p.cancellationPct),
    bookingWindowDays: diff(c.bookingWindowDays, p.bookingWindowDays),
    totalCost: pct(c.totalCost, p.totalCost),
    gop: pct(c.gop, p.gop),
    cpor: pct(c.cpor, p.cpor),
    mpi: pct(c.mpi, p.mpi),
    ari: pct(c.ari, p.ari),
    rgi: pct(c.rgi, p.rgi),
    nps: diff(c.nps, p.nps),
    csat: diff(c.csat, p.csat),
    repeatGuestPts: diff(c.repeatGuestPct, p.repeatGuestPct),
    hkRoomsPerHour: pct(c.hkRoomsPerHour, p.hkRoomsPerHour),
  };
}

/** Row shape returned by `daily_metrics` with the `properties(total_rooms)` embed. */
export type DailyMetricRow = {
  property_id: string;
  metric_date: string;
  rooms_sold: number | string | null;
  total_revenue: number | string | null;
  total_cost: number | string | null;
  gop: number | string | null;
  bookings: number | string | null;
  direct_bookings: number | string | null;
  cancellations: number | string | null;
  avg_booking_window_days: number | string | null;
  market_occupancy_pct: number | string | null;
  market_adr: number | string | null;
  market_revpar: number | string | null;
  nps: number | string | null;
  csat: number | string | null;
  repeat_guest_pct: number | string | null;
  rooms_cleaned: number | string | null;
  housekeeping_hours: number | string | null;
  properties: { total_rooms: number | string | null } | { total_rooms: number | string | null }[] | null;
};

const roundTo = (v: number, d: number) => {
  const f = 10 ** d;
  return (Math.sign(v) * Math.round(Math.abs(v) * f)) / f;
};

/** Per-day rollup replicating the `portfolio_daily` view over an arbitrary property subset. */
export function rollupDaily(rows: DailyMetricRow[]): PortfolioDailyRow[] {
  const byDate = new Map<string, DailyMetricRow[]>();
  for (const r of rows) {
    const g = byDate.get(r.metric_date);
    if (g) g.push(r);
    else byDate.set(r.metric_date, [r]);
  }
  const out: PortfolioDailyRow[] = [];
  for (const [date, group] of [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const lines = group.map((r) => {
      const p = Array.isArray(r.properties) ? r.properties[0] : r.properties;
      return {
        rooms: n0(p?.total_rooms),
        sold: n0(r.rooms_sold),
        bookings: n0(r.bookings),
        r,
      };
    });
    const sumOf = (f: (x: (typeof lines)[number]) => number) =>
      lines.reduce((a, x) => a + f(x), 0);
    // SQL: round(sum(v * w) / nullif(sum(w), 0), d); null v rows are skipped in the numerator only.
    const wavg = (
      val: (x: (typeof lines)[number]) => number | null,
      w: (x: (typeof lines)[number]) => number,
      d: number,
    ): number | null => {
      const den = sumOf(w);
      if (den === 0) return null;
      let num_ = 0;
      let any = false;
      for (const x of lines) {
        const v = val(x);
        if (v == null) continue;
        num_ += v * w(x);
        any = true;
      }
      return any ? roundTo(num_ / den, d) : null;
    };
    const sumCol = (k: keyof DailyMetricRow) => sumOf((x) => n0(x.r[k]));
    out.push({
      metric_date: date,
      properties: lines.length,
      available_rooms: sumOf((x) => x.rooms),
      rooms_sold: sumOf((x) => x.sold),
      total_revenue: sumCol("total_revenue"),
      total_cost: sumCol("total_cost"),
      gop: sumCol("gop"),
      bookings: sumOf((x) => x.bookings),
      direct_bookings: sumCol("direct_bookings"),
      cancellations: sumCol("cancellations"),
      avg_booking_window_days: wavg((x) => num(x.r.avg_booking_window_days), (x) => x.bookings, 1),
      market_occupancy_pct: wavg((x) => num(x.r.market_occupancy_pct), (x) => x.rooms, 2),
      market_adr: wavg((x) => num(x.r.market_adr), (x) => x.sold, 2),
      market_revpar: wavg((x) => num(x.r.market_revpar), (x) => x.rooms, 2),
      nps: wavg((x) => num(x.r.nps), (x) => x.sold, 1),
      csat: wavg((x) => num(x.r.csat), (x) => x.sold, 2),
      repeat_guest_pct: wavg((x) => num(x.r.repeat_guest_pct), (x) => x.sold, 2),
      rooms_cleaned: sumCol("rooms_cleaned"),
      housekeeping_hours: sumCol("housekeeping_hours"),
    });
  }
  return out;
}

const DAILY_COLUMNS =
  "property_id,metric_date,rooms_sold,total_revenue,total_cost,gop,bookings,direct_bookings," +
  "cancellations,avg_booking_window_days,market_occupancy_pct,market_adr,market_revpar,nps,csat," +
  "repeat_guest_pct,rooms_cleaned,housekeeping_hours,properties(total_rooms)";

const PAGE = 1000;

export async function fetchKpis(
  propertyIds: string[] | null,
  now: Date = new Date(),
): Promise<KpiSnapshot | null> {
  if (propertyIds && propertyIds.length === 0) return null;
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1))
    .toISOString()
    .slice(0, 10);
  if (propertyIds === null) {
    const { data, error } = await supabase
      .from("portfolio_daily")
      .select("*")
      .gte("metric_date", from)
      .order("metric_date", { ascending: true });
    if (error) throw error;
    return aggregateKpis((data ?? []) as PortfolioDailyRow[], now);
  }
  // PostgREST caps responses at max_rows (1000); page through with range().
  const rows: DailyMetricRow[] = [];
  for (let start = 0; ; start += PAGE) {
    const { data, error } = await supabase
      .from("daily_metrics")
      .select(DAILY_COLUMNS)
      .in("property_id", propertyIds)
      .gte("metric_date", from)
      .order("metric_date", { ascending: true })
      .order("property_id", { ascending: true })
      .range(start, start + PAGE - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as DailyMetricRow[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return aggregateKpis(rollupDaily(rows), now);
}
