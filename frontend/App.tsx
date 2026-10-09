import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_700Bold,
} from "@expo-google-fonts/archivo";
import { IBMPlexMono_400Regular } from "@expo-google-fonts/ibm-plex-mono";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import { ErrorBlock } from "./components/ErrorBlock";
import { PresetChips } from "./components/PresetChips";
import { PromptBar } from "./components/PromptBar";
import { ResultCanvas } from "./components/ResultCanvas";
import { SqlAccordion } from "./components/SqlAccordion";
import { QueryResult, runQuery } from "./lib/api";
import { space, type } from "./theme/tokens";
import { useTheme } from "./theme/useTheme";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; result: QueryResult }
  | { kind: "error"; message: string };

function Rule({ color }: { color: string }) {
  return <View style={{ height: 1, backgroundColor: color, alignSelf: "stretch" }} />;
}

function LoadingBar({ color }: { color: string }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(w, { toValue: 1, duration: 1200, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [w]);
  const width = w.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  return <Animated.View style={{ height: 2, width, backgroundColor: color, marginTop: 12 }} />;
}

function FadeIn({ children }: { children: React.ReactNode }) {
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(o, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [o]);
  return <Animated.View style={{ opacity: o }}>{children}</Animated.View>;
}

export default function App() {
  const t = useTheme();
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_700Bold,
    IBMPlexMono_400Regular,
  });
  const [state, setState] = useState<State>({ kind: "idle" });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }

  const submit = async (prompt: string) => {
    setState({ kind: "loading" });
    try {
      setState({ kind: "success", result: await runQuery(prompt) });
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "Something went wrong — try again.",
      });
    }
  };
  const loading = state.kind === "loading";

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={{ alignItems: "center" }}>
        <View style={[styles.col, { paddingHorizontal: t.gutter }]}>
          <View style={styles.header}>
            <Text style={[type.display, { color: t.ink }]}>INNSIGHTS</Text>
            <View style={styles.tag}>
              <View style={[styles.square, { backgroundColor: t.accent }]} />
              <Text style={[type.label, { color: t.ink }]}>Portfolio AI</Text>
            </View>
          </View>
          <Rule color={t.hairline} />

          <Text style={[type.body, styles.intro, { color: t.muted }]}>
            Ask a question about a 3-property demo hotel portfolio. Gemini writes the SQL;
            Supabase runs it read-only.
          </Text>
          <PromptBar onSubmit={submit} loading={loading} />
          <PresetChips onSelect={submit} disabled={loading} />
          <View style={{ height: 24 }} />
          <Rule color={t.hairline} />

          <View style={styles.result}>
            {state.kind === "idle" && (
              <Text style={[type.label, { color: t.muted }]}>
                Ask something or tap a preset
              </Text>
            )}
            {state.kind === "loading" && (
              <View>
                <Text style={[type.label, { color: t.muted }]}>Running query</Text>
                <LoadingBar color={t.accent} />
              </View>
            )}
            {state.kind === "error" && (
              <FadeIn key="e">
                <ErrorBlock message={state.message} />
              </FadeIn>
            )}
            {state.kind === "success" && (
              <FadeIn key={state.result.sql + state.result.title}>
                <ResultCanvas result={state.result} />
                <SqlAccordion sql={state.result.sql} />
              </FadeIn>
            )}
          </View>

          <Rule color={t.hairline} />
          <Text style={[type.mono, styles.footer, { color: t.muted }]}>
            SYNTHETIC DATA · READ-ONLY SQL · 20 QUERIES/HR
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { width: "100%", maxWidth: space.maxWidth },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 24,
  },
  tag: { flexDirection: "row", alignItems: "center", columnGap: 8 },
  square: { width: 8, height: 8 },
  intro: { marginTop: 24, marginBottom: 24 },
  result: { paddingVertical: 24, minHeight: 120 },
  footer: { fontSize: 11, paddingVertical: 16 },
});
