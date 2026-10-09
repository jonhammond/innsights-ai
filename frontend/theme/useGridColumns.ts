import { useCallback, useState } from "react";
import { LayoutChangeEvent, useWindowDimensions } from "react-native";
import { space } from "./tokens";

export function gridColumns(width: number, minWidth: number, gap: number): number {
  return Math.max(1, Math.floor((width + gap) / (minWidth + gap)));
}

export function useGridColumns(minWidth: number, gap: number, count = Infinity) {
  const { width: winW } = useWindowDimensions();
  const wide = winW >= space.breakpoint;
  // Initial estimate (before onLayout) avoids a 1-column flash.
  const estimate = wide
    ? winW - space.railW - 2 * space.mainPad
    : winW - 2 * space.mainPadNarrow;
  const [measured, setMeasured] = useState<number | null>(null);
  const width = measured ?? estimate;
  // Like CSS auto-fit: empty tracks collapse so items stretch to fill the row.
  const cols = Math.max(1, Math.min(gridColumns(width, minWidth, gap), count));
  const itemWidth = (width - gap * (cols - 1)) / cols;
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0) setMeasured((prev) => (prev === w ? prev : w));
  }, []);
  return { cols, itemWidth, onLayout };
}
