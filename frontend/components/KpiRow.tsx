import {
  formatCompactCurrency,
  formatCurrency,
  formatDecimal,
  formatIndex,
  formatPercent,
} from "./charts/format";
import { kpiDeltas, KpiSnapshot, MonthStats } from "../lib/kpis";
import { radius } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";
import { KpiCard } from "./KpiCard";
import { KpiSection } from "./KpiSection";
import { Skeleton } from "./Skeleton";

type Props = { snapshot: KpiSnapshot | null; loading: boolean };

const MINUS = "−";
const signed = (v: number, digits: number, suffix: string) => {
  const mag = Math.abs(v).toFixed(digits);
  const sign = v < 0 && Number(mag) !== 0 ? MINUS : "+";
  return `${sign}${mag}${suffix}`;
};
const pct = (v: number | null | undefined) => (v == null ? null : signed(v, 1, "%"));
const pts = (v: number | null | undefined) => (v == null ? null : signed(v, 1, " pts"));
const diff = (digits: number, suffix = "") => (v: number | null | undefined) =>
  v == null ? null : signed(v, digits, suffix);

const fmt = (v: number | null | undefined, f: (n: number) => string) => (v == null ? "—" : f(v));
const fixed = (digits: number) => (n: number) => formatDecimal(n, digits);

export function KpiSections({ snapshot, loading }: Props) {
  const { t } = useTheme();
  if (loading) {
    return (
      <KpiSection title="Revenue" defaultOpen>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} h={104} r={radius.card} />
        ))}
      </KpiSection>
    );
  }
  const c: MonthStats | undefined = snapshot?.closedMonth;
  const d = snapshot ? kpiDeltas(snapshot) : null;
  const priorLabel = snapshot?.priorMonth?.label ?? null;
  const s = c?.series;
  const empty: number[] = [];
  return (
    <>
      <KpiSection title="Revenue" defaultOpen>
        <KpiCard
          label={c ? `Revenue · ${c.label}` : "Revenue"}
          value={fmt(c?.revenue, formatCompactCurrency)}
          delta={pct(d?.revenue)}
          priorLabel={priorLabel}
          series={s?.revenue ?? empty}
          colors={t.kpi.revenue}
        />
        <KpiCard
          label="ADR"
          value={fmt(c?.adr, formatCurrency)}
          delta={pct(d?.adr)}
          priorLabel={priorLabel}
          series={s?.adr ?? empty}
          colors={t.kpi.adr}
        />
        <KpiCard
          label="RevPAR"
          value={fmt(c?.revpar, formatCurrency)}
          delta={pct(d?.revpar)}
          priorLabel={priorLabel}
          series={s?.revpar ?? empty}
          colors={t.kpi.revpar}
        />
        <KpiCard
          label="Occupancy"
          value={fmt(c?.occupancyPct, formatPercent)}
          delta={pts(d?.occupancyPts)}
          priorLabel={priorLabel}
          series={s?.occupancy ?? empty}
          colors={t.kpi.occupancy}
        />
      </KpiSection>
      <KpiSection title="Distribution">
        <KpiCard
          label="Bookings"
          value={fmt(c?.bookings, fixed(0))}
          delta={pct(d?.bookings)}
          priorLabel={priorLabel}
          series={s?.bookings ?? empty}
          colors={t.kpi.distribution}
        />
        <KpiCard
          label="Direct booking ratio"
          value={fmt(c?.directBookingPct, formatPercent)}
          delta={pts(d?.directBookingPts)}
          priorLabel={priorLabel}
          series={s?.directBookingPct ?? empty}
          colors={t.kpi.distribution}
        />
        <KpiCard
          label="Cancellation rate"
          lowerIsBetter
          value={fmt(c?.cancellationPct, formatPercent)}
          delta={pts(d?.cancellationPts)}
          priorLabel={priorLabel}
          series={s?.cancellationPct ?? empty}
          colors={t.kpi.distribution}
        />
        <KpiCard
          label="Booking window (days)"
          value={fmt(c?.bookingWindowDays, fixed(1))}
          delta={diff(1, " d")(d?.bookingWindowDays)}
          priorLabel={priorLabel}
          series={s?.bookingWindowDays ?? empty}
          colors={t.kpi.distribution}
        />
      </KpiSection>
      <KpiSection title="Cost & Profit">
        <KpiCard
          label="Total cost"
          lowerIsBetter
          value={fmt(c?.totalCost, formatCompactCurrency)}
          delta={pct(d?.totalCost)}
          priorLabel={priorLabel}
          series={s?.totalCost ?? empty}
          colors={t.kpi.cost}
        />
        <KpiCard
          label="GOP"
          value={fmt(c?.gop, formatCompactCurrency)}
          delta={pct(d?.gop)}
          priorLabel={priorLabel}
          series={s?.gop ?? empty}
          colors={t.kpi.cost}
        />
        <KpiCard
          label="CPOR"
          lowerIsBetter
          value={fmt(c?.cpor, formatCurrency)}
          delta={pct(d?.cpor)}
          priorLabel={priorLabel}
          series={s?.cpor ?? empty}
          colors={t.kpi.cost}
        />
        <KpiCard
          label="Flow-through"
          value={fmt(snapshot?.flowThroughPct, formatPercent)}
          delta={null}
          priorLabel={null}
          series={empty}
          colors={t.kpi.cost}
        />
      </KpiSection>
      <KpiSection title="Market Index">
        <KpiCard
          label="MPI"
          value={fmt(c?.mpi, formatIndex)}
          delta={pct(d?.mpi)}
          priorLabel={priorLabel}
          series={s?.mpi ?? empty}
          colors={t.kpi.market}
        />
        <KpiCard
          label="ARI"
          value={fmt(c?.ari, formatIndex)}
          delta={pct(d?.ari)}
          priorLabel={priorLabel}
          series={s?.ari ?? empty}
          colors={t.kpi.market}
        />
        <KpiCard
          label="RGI"
          value={fmt(c?.rgi, formatIndex)}
          delta={pct(d?.rgi)}
          priorLabel={priorLabel}
          series={s?.rgi ?? empty}
          colors={t.kpi.market}
        />
      </KpiSection>
      <KpiSection title="Guest Experience">
        <KpiCard
          label="NPS"
          value={fmt(c?.nps, fixed(1))}
          delta={diff(1)(d?.nps)}
          priorLabel={priorLabel}
          series={s?.nps ?? empty}
          colors={t.kpi.guest}
        />
        <KpiCard
          label="CSAT"
          value={fmt(c?.csat, fixed(2))}
          delta={diff(2)(d?.csat)}
          priorLabel={priorLabel}
          series={s?.csat ?? empty}
          colors={t.kpi.guest}
        />
        <KpiCard
          label="Repeat guest ratio"
          value={fmt(c?.repeatGuestPct, formatPercent)}
          delta={pts(d?.repeatGuestPts)}
          priorLabel={priorLabel}
          series={s?.repeatGuestPct ?? empty}
          colors={t.kpi.guest}
        />
        <KpiCard
          label="Housekeeping rooms/hr"
          value={fmt(c?.hkRoomsPerHour, fixed(2))}
          delta={pct(d?.hkRoomsPerHour)}
          priorLabel={priorLabel}
          series={s?.hkRoomsPerHour ?? empty}
          colors={t.kpi.guest}
        />
      </KpiSection>
    </>
  );
}
