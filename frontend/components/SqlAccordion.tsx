import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { type } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";

export function SqlAccordion({ sql }: { sql: string }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        style={styles.row}
      >
        <Text style={[type.label, { color: t.ink }]}>
          {open ? "▾ HIDE GENERATED SQL" : "▸ VIEW GENERATED SQL"}
        </Text>
      </Pressable>
      {open && (
        <View style={[styles.box, { borderColor: t.hairline }]}>
          <ScrollView horizontal>
            <Text selectable style={[type.mono, styles.sql, { color: t.ink }]}>
              {sql}
            </Text>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 32 },
  row: { minHeight: 44, justifyContent: "center" },
  box: { borderWidth: 1, borderRadius: 0, padding: 16, marginTop: 8 },
  sql: { lineHeight: 20 },
});
