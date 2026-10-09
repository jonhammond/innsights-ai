import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { fonts, KpiColors, radius, tabular } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";
import { Sparkline } from "./Sparkline";

type Props = {
  label: string;
  value: string;
  delta: string | null;
  priorLabel: string | null;
  series: number[];
  colors: KpiColors;
};

let gradientSeq = 0;

export function KpiCard({ label, value, delta, priorLabel, series, colors }: Props) {
  const { t } = useTheme();
  const gid = `kpi-glow-${label.replace(/\W/g, "")}-${++gradientSeq}`;
  const up = delta?.startsWith("+");
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.bg.card, borderColor: t.border.row },
      ]}
    >
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <RadialGradient id={gid} cx="100%" cy="0%" r="60%">
            <Stop offset="0" stopColor={colors.glow} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gid})`} />
      </Svg>
      <View style={styles.left}>
        <Text style={[styles.value, tabular, { color: t.text.primary }]}>{value}</Text>
        <Text style={[styles.label, { color: t.text.muted }]}>{label}</Text>
        <Text style={[styles.delta, { color: t.text.subtle }]}>
          {delta ? (
            <>
              <Text style={{ color: up ? t.delta.up : t.delta.down }}>{delta}</Text>
              {priorLabel ? ` vs ${priorLabel}` : ""}
            </>
          ) : (
            "—"
          )}
        </Text>
      </View>
      <Sparkline points={series} color={colors.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 22,
    minHeight: 104,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
  },
  left: { flexShrink: 1 },
  value: { fontFamily: fonts.sans700, fontSize: 28, lineHeight: 34, letterSpacing: -0.56 },
  label: { fontFamily: fonts.sans400, fontSize: 13, marginTop: 2 },
  delta: { fontFamily: fonts.mono400, fontSize: 11, marginTop: 8 },
});
