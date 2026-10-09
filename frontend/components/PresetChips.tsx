import { Pressable, StyleSheet, Text, View } from "react-native";
import { type } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";

const PRESETS = [
  "Portfolio ADR trend last 30 days",
  "RevPAR vs occupancy last 30 days",
  "Top property by occupancy",
  "Revenue by property this month",
  "Total revenue yesterday",
];

type Props = { onSelect: (prompt: string) => void; disabled?: boolean };

export function PresetChips({ onSelect, disabled }: Props) {
  const t = useTheme();
  return (
    <View style={styles.wrap}>
      {PRESETS.map((p) => (
        <Pressable
          key={p}
          disabled={disabled}
          onPress={() => onSelect(p)}
          accessibilityRole="button"
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.chip,
            { borderColor: pressed || hovered ? t.accent : t.hairline },
          ]}
        >
          {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => (
            <Text style={[type.label, { color: pressed || hovered ? t.accent : t.ink }]}>
              {p}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  chip: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
    backgroundColor: "transparent",
  },
});
