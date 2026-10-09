import { ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fonts, space, type } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";
import { Grid } from "./Grid";

type Props = { title: string; defaultOpen?: boolean; children: ReactNode };

export function KpiSection({ title, defaultOpen = false, children }: Props) {
  const { t } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={styles.header}
      >
        <Text style={[styles.chevron, { color: t.text.subtle }]}>{open ? "▾" : "▸"}</Text>
        <Text style={[type.label14, { color: t.text.secondary }]}>{title}</Text>
      </Pressable>
      {open ? <Grid minWidth={220}>{children}</Grid> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.gap - 4 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 },
  chevron: { fontFamily: fonts.sans500, fontSize: 14, width: 14 },
});
