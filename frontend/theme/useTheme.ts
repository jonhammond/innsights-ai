import { useColorScheme, useWindowDimensions } from "react-native";
import { dark, light, Palette, space } from "./tokens";

export function useTheme(): {
  t: Palette;
  scheme: "dark" | "light";
  wide: boolean;
  width: number;
} {
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const scheme = colorScheme === "dark" ? "dark" : "light";
  return {
    t: scheme === "dark" ? dark : light,
    scheme,
    wide: width >= space.breakpoint,
    width,
  };
}
