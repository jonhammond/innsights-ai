import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from "@expo-google-fonts/ibm-plex-mono";
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from "@expo-google-fonts/instrument-sans";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useReducer } from "react";
import { Platform, ScrollView, View } from "react-native";
import { AnswerCard } from "./components/AnswerCard";
import { MetricBarChart } from "./components/charts/MetricBarChart";
import { Footer } from "./components/Footer";
import { Grid } from "./components/Grid";
import { Header } from "./components/Header";
import { KpiSections } from "./components/KpiRow";
import { PropertyTable } from "./components/PropertyTable";
import { QuestionPanel } from "./components/QuestionPanel";
import { Rail } from "./components/Rail";
import { QueryError, QueryResult, runQuery } from "./lib/api";
import { downloadCsv } from "./lib/csv";
import { fetchKpis, KpiSnapshot } from "./lib/kpis";
import { mapResult } from "./lib/resultMapping";
import { space } from "./theme/tokens";
import { useTheme } from "./theme/useTheme";

type Status = "idle" | "loading" | "error" | "rate_limited";

type State = {
  question: string;
  status: Status;
  errorMessage: string | null;
  result: QueryResult | null;
  sqlOpen: boolean;
  kpis: { status: "loading" | "ready" | "error"; data: KpiSnapshot | null };
};

type Action =
  | { type: "SET_QUESTION"; question: string }
  | { type: "SUBMIT" }
  | { type: "SUCCESS"; result: QueryResult }
  | { type: "FAIL"; message: string; code?: string }
  | { type: "TOGGLE_SQL" }
  | { type: "KPIS_LOADED"; data: KpiSnapshot | null }
  | { type: "KPIS_FAILED" }
  | { type: "RESET_RATE_LIMIT" };

const initial: State = {
  question: "",
  status: "idle",
  errorMessage: null,
  result: null,
  sqlOpen: false,
  kpis: { status: "loading", data: null },
};

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "SET_QUESTION":
      return { ...s, question: a.question };
    case "SUBMIT":
      return { ...s, status: "loading", errorMessage: null };
    case "SUCCESS":
      return { ...s, status: "idle", errorMessage: null, result: a.result };
    case "FAIL":
      return {
        ...s,
        status: a.code === "rate_limited" ? "rate_limited" : "error",
        errorMessage: a.message,
      };
    case "TOGGLE_SQL":
      return { ...s, sqlOpen: !s.sqlOpen };
    case "KPIS_LOADED":
      return { ...s, kpis: { status: "ready", data: a.data } };
    case "KPIS_FAILED":
      return { ...s, kpis: { status: "error", data: null } };
    case "RESET_RATE_LIMIT":
      return { ...s, status: "idle", errorMessage: null };
  }
}

const SUGGESTIONS = [
  "Portfolio ADR, last 30 days",
  "RevPAR vs occupancy",
  "Top property by occupancy",
  "Revenue by property this month",
  "Total revenue yesterday",
  "Direct booking ratio by property, last 30 days",
  "CPOR vs ADR by property",
  "RGI trend, last 60 days",
  "NPS and CSAT by segment",
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "result";

export default function App() {
  const { t, wide } = useTheme();
  const [fontsLoaded] = useFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });
  const [state, dispatch] = useReducer(reducer, initial);
  const { question, status, errorMessage, result, sqlOpen, kpis } = state;

  useEffect(() => {
    let cancelled = false;
    fetchKpis()
      .then((data) => !cancelled && dispatch({ type: "KPIS_LOADED", data }))
      .catch(() => !cancelled && dispatch({ type: "KPIS_FAILED" }));
    return () => {
      cancelled = true;
    };
  }, []);

  const mapped = useMemo(() => (result ? mapResult(result) : null), [result]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: t.bg.page }} />;
  }

  const submit = async (q: string) => {
    const text = q.trim();
    if (!text || status === "loading" || status === "rate_limited") return;
    dispatch({ type: "SET_QUESTION", question: text });
    dispatch({ type: "SUBMIT" });
    try {
      dispatch({ type: "SUCCESS", result: await runQuery(text) });
    } catch (e) {
      dispatch({
        type: "FAIL",
        message: e instanceof Error ? e.message : "Something went wrong — try again.",
        code: e instanceof QueryError ? e.code : undefined,
      });
    }
  };

  const pad = wide
    ? { paddingTop: 22, paddingHorizontal: space.mainPad + 2, paddingBottom: 32 }
    : { padding: space.mainPadNarrow };

  return (
    <View style={{ flex: 1, flexDirection: wide ? "row" : "column", backgroundColor: t.bg.page }}>
      <StatusBar style="auto" />
      <Rail />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[{ flexDirection: "column", gap: space.gap }, pad]}
        keyboardShouldPersistTaps="handled"
      >
        <Header
          propertyCount={kpis.data?.portfolio.propertyCount ?? null}
          totalRooms={kpis.data?.portfolio.totalRooms ?? null}
          sqlOpen={sqlOpen}
          canToggleSql={!!result}
          onToggleSql={() => dispatch({ type: "TOGGLE_SQL" })}
          canExport={!!result?.rows.length && Platform.OS === "web"}
          onExport={() => result && downloadCsv(result.rows, `${slug(result.title)}.csv`)}
        />
        <QuestionPanel
          value={question}
          onChange={(v) => dispatch({ type: "SET_QUESTION", question: v })}
          onSubmit={submit}
          loading={status === "loading"}
          disabled={status === "rate_limited"}
          suggestions={SUGGESTIONS}
        />
        <KpiSections snapshot={kpis.data} loading={kpis.status === "loading"} />
        {mapped && mapped.charts.length > 0 ? (
          <Grid minWidth={280}>
            {mapped.charts.map((s) => (
              <MetricBarChart key={s.key} series={s} />
            ))}
          </Grid>
        ) : null}
        <Grid minWidth={340} alignStart>
          {mapped?.table && result ? (
            <PropertyTable title={result.title} columns={mapped.table.columns} rows={mapped.table.rows} />
          ) : null}
          <AnswerCard
            status={status}
            summary={mapped?.summary ?? null}
            caveat={result?.caveat ?? null}
            errorMessage={errorMessage}
            rowCount={result?.rows.length ?? null}
            durationMs={result?.duration_ms ?? null}
            sql={result?.sql ?? null}
            sqlOpen={sqlOpen}
            onToggleSql={() => dispatch({ type: "TOGGLE_SQL" })}
            onResetRateLimit={() => dispatch({ type: "RESET_RATE_LIMIT" })}
          />
        </Grid>
        <Footer />
      </ScrollView>
    </View>
  );
}
