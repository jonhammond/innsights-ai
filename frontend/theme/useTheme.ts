import { useColorScheme, useWindowDimensions } from "react-native";
import { dark, light, Palette, space } from "./tokens";

export function useTheme(): Palette & { wide: boolean; gutter: number } {
  const scheme = useColorScheme();
  const { width } = useWindowDimensions();
  const wide = width >= space.breakpoint;
  return {
    ...(scheme === "dark" ? dark : light),
    wide,
    gutter: wide ? space.gutterWide : space.gutter,
  };
}
