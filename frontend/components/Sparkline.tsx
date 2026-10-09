import Svg, { Circle, Polyline } from "react-native-svg";

type Props = { points: number[]; color: string; width?: number; height?: number };

export function Sparkline({ points, color, width = 96, height = 40 }: Props) {
  const n = points.length;
  if (n < 2) return <Svg width={width} height={height} viewBox="0 0 100 40" />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min;
  const coords = points.map((v, i) => ({
    x: (i / (n - 1)) * 100,
    y: range === 0 ? 20 : 36 - ((v - min) / range) * 32,
  }));
  const last = coords[n - 1];
  return (
    <Svg width={width} height={height} viewBox="0 0 100 40">
      <Polyline
        points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={last.x} cy={last.y} r={3.5} fill={color} />
    </Svg>
  );
}
