import { StyleSheet, Text, View } from "react-native";
import { type } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";

export function ErrorBlock({ message }: { message: string }) {
  const t = useTheme();
  return (
    <View style={[styles.wrap, { borderTopColor: t.accent }]}>
      <Text style={[type.label, { color: t.accent }]}>Error</Text>
      <Text style={[type.mono, styles.msg, { color: t.ink }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 2, paddingTop: 12 },
  msg: { marginTop: 8, lineHeight: 20 },
});
