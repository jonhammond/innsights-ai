import { useState } from "react";
import { View } from "react-native";
import { VictoryAxis, VictoryBar, VictoryChart } from "victory";
import { useTheme } from "../../theme/useTheme";
import { axisStyles, CHART_HEIGHT, CHART_PADDING } from "./axisStyle";
import { columnRoles, formatNumber, toNumber } from "./format";

const trunc = (s: string) => (s.length > 12 ? `${s.slice(0, 11)}…` : s);

export function CategoryChart({ rows }: { rows: Record<string, unknown>[] }) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const { xKey, yKeys } = columnRoles(rows);
  const yKey = yKeys[0];
  const ax = axisStyles(t);
  const labels = rows.map((r) => String(r[xKey]));
  const angled = rows.length > 4;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <VictoryChart
          width={width}
          height={CHART_HEIGHT}
          padding={CHART_PADDING}
          domainPadding={{ x: 24 }}
        >
          <VictoryAxis
            tickValues={labels.map((_, i) => i + 1)}
            tickFormat={(i: number) => trunc(labels[i - 1] ?? "")}
            style={{
              ...ax.x,
              tickLabels: {
                ...ax.x.tickLabels,
                angle: angled ? -30 : 0,
                textAnchor: angled ? "end" : "middle",
              },
            }}
          />
          <VictoryAxis
            dependentAxis
            tickFormat={(v: number) => formatNumber(v)}
            style={ax.y}
          />
          <VictoryBar
            horizontal={false}
            barRatio={0.6}
            data={rows.map((r, i) => ({ x: i + 1, y: toNumber(r[yKey]) }))}
            style={{ data: { fill: t.accent } }}
          />
        </VictoryChart>
      )}
    </View>
  );
}
