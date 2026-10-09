import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { VictoryAxis, VictoryChart, VictoryLine } from "victory";
import { type } from "../../theme/tokens";
import { useTheme } from "../../theme/useTheme";
import { axisStyles, CHART_HEIGHT, CHART_PADDING } from "./axisStyle";
import {
  columnRoles,
  formatDateTick,
  formatNumber,
  humanize,
  toNumber,
} from "./format";

export function TrendChart({ rows }: { rows: Record<string, unknown>[] }) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const { xKey, yKeys } = columnRoles(rows);
  const colors = [t.accent, t.ink, t.muted];
  const ax = axisStyles(t);
  const labels = rows.map((r) => String(r[xKey]));
  const n = rows.length;
  const step = Math.max(1, Math.ceil(n / 6));
  const tickValues = labels.map((_, i) => i + 1).filter((i) => (i - 1) % step === 0);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {yKeys.length > 1 && (
        <View style={styles.legend}>
          {yKeys.map((k, i) => (
            <View key={k} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: colors[i % 3] }]} />
              <Text style={[type.label, { color: t.ink }]}>{humanize(k)}</Text>
            </View>
          ))}
        </View>
      )}
      {width > 0 && (
        <VictoryChart
          width={width}
          height={CHART_HEIGHT}
          padding={CHART_PADDING}
          domainPadding={{ y: 8 }}
        >
          <VictoryAxis
            tickValues={tickValues}
            tickFormat={(i: number) => formatDateTick(labels[i - 1])}
            style={ax.x}
          />
          <VictoryAxis
            dependentAxis
            tickFormat={(v: number) => formatNumber(v)}
            style={ax.y}
          />
          {yKeys.map((k, i) => (
            <VictoryLine
              key={k}
              data={rows.map((r, idx) => ({ x: idx + 1, y: toNumber(r[k]) }))}
              style={{ data: { stroke: colors[i % 3], strokeWidth: 2 } }}
            />
          ))}
        </VictoryChart>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: 16, marginBottom: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", columnGap: 6 },
  swatch: { width: 8, height: 2 },
});
