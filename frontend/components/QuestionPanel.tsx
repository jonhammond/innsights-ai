import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableStateCallbackType,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { fonts, radius } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (q: string) => void;
  loading: boolean;
  disabled: boolean;
  suggestions: string[];
};

export function QuestionPanel({ value, onChange, onSubmit, loading, disabled, suggestions }: Props) {
  const { t } = useTheme();
  const [focused, setFocused] = useState(false);
  const askDisabled = disabled || loading;
  const submit = () => {
    if (!askDisabled && value.trim()) onSubmit(value);
  };
  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: t.bg.panel,
          borderColor: t.border.panelAccent,
          boxShadow: `0 0 0 4px ${t.accent.ring}`,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: t.text.primary }]}>Ask a question about the portfolio</Text>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: t.bg.input,
            borderColor: focused ? t.accent.blueFocus : t.border.strong,
          },
        ]}
      >
        <Feather name="search" size={13} color={t.text.dim} />
        <TextInput
          value={value}
          onChangeText={onChange}
          onSubmitEditing={submit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={!disabled}
          placeholder="e.g. What is month-end revenue looking like?"
          placeholderTextColor={t.text.subtle}
          returnKeyType="search"
          style={[styles.input, { color: t.text.primary }]}
        />
        <Pressable
          onPress={submit}
          disabled={askDisabled}
          accessibilityRole="button"
          style={(state: PressableStateCallbackType) => {
            const hovered = (state as PressableStateCallbackType & { hovered?: boolean }).hovered;
            return [
              styles.ask,
              {
                backgroundColor: hovered ? t.accent.blueHover : t.accent.blue,
                opacity: askDisabled ? 0.5 : 1,
              },
            ];
          }}
        >
          {loading ? <ActivityIndicator size="small" color={t.text.onAccent} /> : null}
          <Text style={[styles.askText, { color: t.text.onAccent }]}>
            {loading ? "Thinking…" : "Ask →"}
          </Text>
        </Pressable>
      </View>
      <View style={styles.chips}>
        {suggestions.map((s) => (
          <Pressable
            key={s}
            disabled={disabled}
            accessibilityRole="button"
            onPress={() => {
              onChange(s);
              onSubmit(s);
            }}
            style={(state: PressableStateCallbackType) => {
              const hovered = (state as PressableStateCallbackType & { hovered?: boolean }).hovered;
              return [
                styles.chip,
                {
                  backgroundColor: t.bg.chip,
                  borderColor: hovered ? t.text.subtle : t.border.chip,
                },
              ];
            }}
          >
            {(state: PressableStateCallbackType) => {
              const hovered = (state as PressableStateCallbackType & { hovered?: boolean }).hovered;
              return (
                <Text
                  style={[
                    styles.chipText,
                    { color: hovered ? t.text.onAccent : t.text.secondary },
                  ]}
                >
                  {s}
                </Text>
              );
            }}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.card,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 12,
  },
  label: { fontFamily: fonts.sans700, fontSize: 14 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.input,
    paddingTop: 6,
    paddingRight: 6,
    paddingBottom: 6,
    paddingLeft: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.sans400,
    fontSize: 16,
    backgroundColor: "transparent",
    outlineStyle: "none",
  } as object,
  ask: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: radius.ask,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  askText: { fontFamily: fonts.sans500, fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
  },
  chipText: { fontFamily: fonts.sans400, fontSize: 12, whiteSpace: "nowrap" } as object,
});
