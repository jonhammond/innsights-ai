import { StyleSheet, Text, View } from "react-native";
import type { QueryResult } from "../lib/api";
import { type } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";
import { CategoryChart } from "./charts/CategoryChart";
import { DataGrid } from "./charts/DataGrid";
import { KpiTiles } from "./charts/KpiTiles";
import { TrendChart } from "./charts/TrendChart";
import { columnRoles } from "./charts/format";

export function ResultCanvas({ result }: { result: QueryResult }) {
  const t = useTheme();
  const { rows, chart, title } = result;

  let body;
  if (rows.length === 0) {
    body = <Text style={[type.mono, { color: t.muted }]}>NO ROWS RETURNED</Text>;
  } else {
    const { yKeys } = columnRoles(rows);
    const plottable = yKeys.length > 0;
    if (chart === "kpi") body = <KpiTiles rows={rows} />;
    else if (chart === "line" && plottable && rows.length > 1)
      body = <TrendChart rows={rows} />;
    else if (chart === "bar" && plottable) body = <CategoryChart rows={rows} />;
    else body = <DataGrid rows={rows} />;
  }

  return (
    <View>
      <Text style={[type.label, { color: t.muted }]}>Result</Text>
      <Text style={[type.display, styles.title, { color: t.ink }]}>{title}</Text>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 34, marginTop: 8, marginBottom: 24 },
});
