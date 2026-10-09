import { Children, ReactNode } from "react";
import { View } from "react-native";
import { useGridColumns } from "../theme/useGridColumns";

type Props = { minWidth: number; gap?: number; alignStart?: boolean; children: ReactNode };

export function Grid({ minWidth, gap = 16, alignStart, children }: Props) {
  const items = Children.toArray(children);
  const { itemWidth, onLayout } = useGridColumns(minWidth, gap, items.length);
  return (
    <View
      onLayout={onLayout}
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap,
        alignItems: alignStart ? "flex-start" : "stretch",
      }}
    >
      {items.map((child, i) => (
        <View key={i} style={{ width: itemWidth }}>
          {child}
        </View>
      ))}
    </View>
  );
}
