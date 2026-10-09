import { Feather } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { space } from "../theme/tokens";
import { Logo } from "./Logo";
import { useTheme } from "../theme/useTheme";

type Props = { active?: "dashboard" | "history" | "settings" };

const ITEMS = [
  { key: "dashboard", icon: "grid" },
  { key: "history", icon: "clock" },
  { key: "settings", icon: "settings" },
] as const;

export function Rail({ active = "dashboard" }: Props) {
  const { t, wide } = useTheme();
  return (
    <View
      style={[
        wide ? styles.column : styles.bar,
        {
          backgroundColor: t.bg.rail,
          borderColor: t.border.rail,
          ...(wide ? { borderRightWidth: 1 } : { borderBottomWidth: 1 }),
        },
      ]}
    >
      <Logo size={30} />
      <View
        style={
          wide
            ? { width: 28, height: 1, backgroundColor: t.bg.card }
            : { width: 1, height: 28, backgroundColor: t.bg.card }
        }
      />
      {ITEMS.map(({ key, icon }) => {
        const on = key === active;
        return (
          <View
            key={key}
            style={[styles.circle, { backgroundColor: on ? t.accent.blue : "transparent" }]}
          >
            <Feather name={icon} size={16} color={on ? t.text.onAccent : t.text.subtle} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    width: space.railW,
    alignItems: "center",
    paddingVertical: 18,
    gap: 14,
  },
  bar: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 14,
  },
  circle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
