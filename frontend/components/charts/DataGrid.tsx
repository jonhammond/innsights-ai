import { ScrollView, StyleSheet, Text, View } from "react-native";
import { fonts, type } from "../../theme/tokens";
import { useTheme } from "../../theme/useTheme";
import { formatNumber, humanize, isNumeric } from "./format";

const MIN_COL = 96;

export function DataGrid({ rows }: { rows: Record<string, unknown>[] }) {
  const t = useTheme();
  const cols = Object.keys(rows[0] ?? {});
  return (
    <ScrollView horizontal>
      <View style={{ minWidth: "100%" }}>
        <View style={[styles.row, { borderBottomColor: t.ink }]}>
          {cols.map((c) => (
            <Text
              key={c}
              style={[type.label, styles.cell, { color: t.muted }]}
              numberOfLines={1}
            >
              {humanize(c)}
            </Text>
          ))}
        </View>
        {rows.map((r, i) => (
          <View key={i} style={[styles.row, { borderBottomColor: t.hairline }]}>
            {cols.map((c) => {
              const num = isNumeric(r[c]);
              return (
                <Text
                  key={c}
                  selectable
                  style={[
                    styles.cell,
                    num ? type.mono : styles.text,
                    { color: t.ink, textAlign: num ? "right" : "left" },
                  ]}
                >
                  {num ? formatNumber(r[c]) : String(r[c] ?? "")}
                </Text>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", borderBottomWidth: 1, paddingVertical: 10 },
  cell: { flex: 1, minWidth: MIN_COL, paddingRight: 16 },
  text: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
});
