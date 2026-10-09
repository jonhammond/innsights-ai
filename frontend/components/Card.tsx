import { ReactNode } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { radius } from "../theme/tokens";
import { useTheme } from "../theme/useTheme";

type Props = { children: ReactNode; style?: StyleProp<ViewStyle> };

export function Card({ children, style }: Props) {
  const { t } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.bg.card,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: t.border.row,
          padding: 16,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
