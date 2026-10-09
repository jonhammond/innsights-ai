import { StyleSheet, Text, View } from "react-native";
import { fonts } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";

const ITEMS = ["Synthetic data", "Read-only SQL", "20 queries / hour"];

export function Footer() {
  const { t } = useTheme();
  return (
    <View style={styles.row}>
      {ITEMS.map((s) => (
        <Text key={s} style={[styles.text, { color: t.text.subtle }]}>
          {s}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  text: { fontFamily: fonts.mono400, fontSize: 11 },
});
