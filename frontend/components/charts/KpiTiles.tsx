import { StyleSheet, Text, View } from "react-native";
import { type } from "../../theme/tokens";
import { useTheme } from "../../theme/useTheme";
import { formatNumber, humanize, isNumeric } from "./format";

export function KpiTiles({ rows }: { rows: Record<string, unknown>[] }) {
  const t = useTheme();
  const row = rows[0];
  const numStyle = t.wide ? type.kpiWide : type.kpi;
  return (
    <View style={styles.wrap}>
      {Object.entries(row).map(([k, v]) => (
        <View key={k} style={styles.tile}>
          <Text
            style={[isNumeric(v) ? numStyle : type.display, { color: t.ink }]}
            selectable
          >
            {formatNumber(v)}
          </Text>
          <Text style={[type.label, styles.label, { color: t.muted }]}>
            {humanize(k)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", columnGap: 40, rowGap: 24 },
  tile: { minWidth: 140 },
  label: { marginTop: 4 },
});
