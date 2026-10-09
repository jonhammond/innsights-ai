import { fonts, Palette } from "../../theme/tokens";

export const CHART_HEIGHT = 280;
export const CHART_PADDING = { top: 16, bottom: 48, left: 56, right: 16 };

export function axisStyles(t: Palette) {
  const tickLabels = {
    fontFamily: fonts.mono,
    fontSize: 10,
    fill: t.muted,
    padding: 6,
  };
  return {
    x: {
      axis: { stroke: t.ink, strokeWidth: 1 },
      grid: { stroke: "transparent" },
      ticks: { stroke: "transparent" },
      tickLabels,
    },
    y: {
      axis: { stroke: "transparent" },
      grid: { stroke: t.hairline, strokeWidth: 1 },
      ticks: { stroke: "transparent" },
      tickLabels,
    },
  };
}
