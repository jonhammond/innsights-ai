import { useEffect, useState } from "react";
import { Animated, DimensionValue, Platform } from "react-native";
import { useTheme } from "../theme/useTheme";

type Props = { w?: DimensionValue; h?: number; r?: number };

export function Skeleton({ w = "100%", h = 14, r = 4 }: Props) {
  const { t } = useTheme();
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 800,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={{ width: w, height: h, borderRadius: r, backgroundColor: t.bg.skeleton, opacity }}
    />
  );
}
