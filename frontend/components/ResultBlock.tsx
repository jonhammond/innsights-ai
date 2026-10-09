import { ReactNode, useEffect, useState } from "react";
import { Animated } from "react-native";
import { radius, space } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";

type Props = {
  flashKey: number;
  onLayout: (y: number) => void;
  children: ReactNode;
};

export function ResultBlock({ flashKey, onLayout, children }: Props) {
  const { t } = useTheme();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (flashKey <= 0) return;
    const anim = Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.delay(600),
      Animated.timing(v, { toValue: 0, duration: 600, useNativeDriver: false }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [flashKey, v]);
  const accent = t.border.panelAccent;
  const clear = accent.length === 9 ? `${accent.slice(0, 7)}00` : "transparent";
  const borderColor = v.interpolate({ inputRange: [0, 1], outputRange: [clear, accent] });
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      onLayout={(e) => onLayout(e.nativeEvent.layout.y)}
      style={{ margin: -1, borderWidth: 1, borderColor, borderRadius: radius.card, gap: space.gap }}
    >
      {children}
    </Animated.View>
  );
}
