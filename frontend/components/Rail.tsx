import { Feather } from "@expo/vector-icons";
import { Pressable, PressableStateCallbackType, StyleSheet, Text, View } from "react-native";
import { fonts, space } from "../theme/tokens";
import { Logo } from "./Logo";
import { useTheme } from "../theme/useTheme";

type Props = {
  selectedCount: number;
  onOpenProperties: () => void;
  scheme: "dark" | "light";
  onToggleTheme: () => void;
};

export function Rail({ selectedCount, onOpenProperties, scheme, onToggleTheme }: Props) {
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
      <Pressable
        onPress={onOpenProperties}
        accessibilityRole="button"
        accessibilityLabel="Select properties"
        style={[styles.circle, { backgroundColor: t.accent.blue }]}
      >
        <Feather name="list" size={16} color={t.text.onAccent} />
        <View style={[styles.badge, { backgroundColor: t.accent.pink }]}>
          <Text style={styles.badgeText}>{selectedCount}</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={onToggleTheme}
        accessibilityRole="button"
        accessibilityLabel={scheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        style={(state: PressableStateCallbackType) => {
          const hovered = (state as PressableStateCallbackType & { hovered?: boolean }).hovered;
          return [
            styles.circle,
            { backgroundColor: hovered || state.pressed ? t.bg.card : "transparent" },
          ];
        }}
      >
        <Feather name={scheme === "dark" ? "sun" : "moon"} size={16} color={t.text.subtle} />
      </Pressable>
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
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#ffffff",
    fontFamily: fonts.sans600,
    fontSize: 10,
    lineHeight: 12,
    textAlign: "center",
  },
});
