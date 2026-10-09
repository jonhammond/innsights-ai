import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { type } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";

type Props = { onSubmit: (prompt: string) => void; loading: boolean };

export function PromptBar({ onSubmit, loading }: Props) {
  const t = useTheme();
  const [text, setText] = useState("");
  const empty = text.trim().length === 0;
  const disabled = loading || empty;
  const submit = () => {
    if (!disabled) onSubmit(text.trim());
  };

  return (
    <View style={styles.row}>
      <TextInput
        style={[
          styles.input,
          type.body,
          { color: t.ink, borderBottomColor: t.hairline },
        ]}
        value={text}
        onChangeText={setText}
        placeholder="Ask about occupancy, ADR, RevPAR…"
        placeholderTextColor={t.muted}
        maxLength={500}
        returnKeyType="go"
        onSubmitEditing={submit}
        accessibilityLabel="Question"
      />
      <Pressable
        onPress={submit}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Submit question"
        style={[styles.submit, { backgroundColor: disabled ? t.muted : t.accent }]}
      >
        <Text style={[styles.arrow, { color: t.onAccent }]}>→</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end" },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 0,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderRadius: 0,
    outlineWidth: 0,
  },
  submit: {
    width: 48,
    height: 48,
    marginLeft: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
  },
  arrow: { fontFamily: "Archivo_700Bold", fontSize: 20 },
});
