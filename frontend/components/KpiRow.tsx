import { formatCompactCurrency, formatCurrency, formatPercent } from "./charts/format";
import { kpiDeltas, KpiSnapshot } from "../lib/kpis";
import { radius } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";
import { Grid } from "./Grid";
import { KpiCard } from "./KpiCard";
import { Skeleton } from "./Skeleton";

type Props = { snapshot: KpiSnapshot | null; loading: boolean };

const MINUS = "−";
const pct = (v: number | null | undefined) =>
  v == null ? null : `${v < 0 ? MINUS : "+"}${Math.abs(v).toFixed(1)}%`;
const pts = (v: number | null | undefined) =>
  v == null ? null : `${v < 0 ? MINUS : "+"}${Math.abs(v).toFixed(1)} pts`;

export function KpiRow({ snapshot, loading }: Props) {
  const { t } = useTheme();
  if (loading) {
    return (
      <Grid minWidth={220}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} h={104} r={radius.card} />
        ))}
      </Grid>
    );
  }
  const c = snapshot?.closedMonth;
  const d = snapshot ? kpiDeltas(snapshot) : null;
  const priorLabel = snapshot?.priorMonth?.label ?? null;
  const fmt = (v: number | null | undefined, f: (n: number) => string) => (v == null ? "—" : f(v));
  return (
    <Grid minWidth={220}>
      <KpiCard
        label={c ? `Revenue · ${c.label}` : "Revenue"}
        value={fmt(c?.revenue, formatCompactCurrency)}
        delta={pct(d?.revenue)}
        priorLabel={priorLabel}
        series={c?.series.revenue ?? []}
        colors={t.kpi.revenue}
      />
      <KpiCard
        label="ADR"
        value={fmt(c?.adr, formatCurrency)}
        delta={pct(d?.adr)}
        priorLabel={priorLabel}
        series={c?.series.adr ?? []}
        colors={t.kpi.adr}
      />
      <KpiCard
        label="RevPAR"
        value={fmt(c?.revpar, formatCurrency)}
        delta={pct(d?.revpar)}
        priorLabel={priorLabel}
        series={c?.series.revpar ?? []}
        colors={t.kpi.revpar}
      />
      <KpiCard
        label="Occupancy"
        value={fmt(c?.occupancyPct, formatPercent)}
        delta={pts(d?.occupancyPts)}
        priorLabel={priorLabel}
        series={c?.series.occupancy ?? []}
        colors={t.kpi.occupancy}
      />
    </Grid>
  );
}
