import { Pressable, PressableStateCallbackType, ScrollView, StyleSheet, Text, View } from "react-native";
import { fonts, radius, tabular } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";
import { Card } from "./Card";
import { Skeleton } from "./Skeleton";

type Props = {
  status: "idle" | "loading" | "error" | "rate_limited";
  summary: string | null;
  caveat: string | null;
  errorMessage: string | null;
  rowCount: number | null;
  durationMs: number | null;
  sql: string | null;
  sqlOpen: boolean;
  onToggleSql: () => void;
  onResetRateLimit: () => void;
};

const hovered = (s: PressableStateCallbackType) =>
  Boolean((s as PressableStateCallbackType & { hovered?: boolean }).hovered);

export function AnswerCard({
  status,
  summary,
  caveat,
  errorMessage,
  rowCount,
  durationMs,
  sql,
  sqlOpen,
  onToggleSql,
  onResetRateLimit,
}: Props) {
  const { t } = useTheme();
  const meta = [
    rowCount != null ? `${rowCount} rows` : null,
    durationMs != null ? `${durationMs} ms` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const summaryText = summary ? (
    <Text style={[styles.summary, { color: t.text.primary }]}>{summary}</Text>
  ) : null;
  const caveatText = (text: string) => (
    <Text style={[styles.caveat, { color: t.text.muted }]}>{text}</Text>
  );

  let body;
  if (status === "loading") {
    body = (
      <>
        <Skeleton h={22} w="90%" />
        <Skeleton h={14} w="60%" />
        {summaryText}
      </>
    );
  } else if (status === "error") {
    body = (
      <>
        <Text style={[styles.body, { color: t.delta.error }]}>{errorMessage}</Text>
        {summaryText}
      </>
    );
  } else if (status === "rate_limited") {
    body = (
      <>
        {summaryText}
        {caveatText("Rate limit reached — 20 queries per hour. Try again later.")}
        <Pressable onPress={onResetRateLimit} accessibilityRole="link" style={styles.link}>
          {(s) => (
            <Text style={[styles.body, { color: hovered(s) ? t.accent.linkHover : t.accent.link }]}>
              Try again
            </Text>
          )}
        </Pressable>
      </>
    );
  } else if (summary) {
    body = (
      <>
        {summaryText}
        {caveat ? caveatText(caveat) : null}
      </>
    );
  } else {
    body = <Text style={[styles.body, { color: t.text.muted }]}>Ask a question or pick a suggestion.</Text>;
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.text.primary }]}>Answer</Text>
        {meta ? <Text style={[styles.meta, { color: t.text.subtle }]}>{meta}</Text> : null}
      </View>
      {body}
      {sqlOpen && sql ? (
        <ScrollView
          horizontal
          style={[styles.codeBox, { backgroundColor: t.bg.code, borderRadius: radius.input }]}
          contentContainerStyle={styles.codeInner}
        >
          <Text selectable style={[styles.code, { color: t.text.secondary }]}>
            {sql}
          </Text>
        </ScrollView>
      ) : null}
      {sql ? (
        <Pressable onPress={onToggleSql} accessibilityRole="button" style={styles.link}>
          {(s) => (
            <Text style={[styles.body, { color: hovered(s) ? t.accent.linkHover : t.accent.link }]}>
              {sqlOpen ? "Hide generated SQL" : "View generated SQL →"}
            </Text>
          )}
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 18, paddingHorizontal: 20, gap: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  title: { fontFamily: fonts.sans700, fontSize: 13 },
  meta: { fontFamily: fonts.mono400, fontSize: 11, ...tabular },
  body: { fontFamily: fonts.sans400, fontSize: 13 },
  summary: { fontFamily: fonts.sans500, fontSize: 18, lineHeight: 25 },
  caveat: { fontFamily: fonts.sans400, fontSize: 13, lineHeight: 19.5 },
  link: { alignSelf: "flex-start" },
  codeBox: { flexGrow: 0 },
  codeInner: { paddingVertical: 14, paddingHorizontal: 16 },
  code: { fontFamily: fonts.mono400, fontSize: 12, lineHeight: 19 },
});
