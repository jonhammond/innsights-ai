export type Palette = {
  bg: string;
  ink: string;
  muted: string;
  hairline: string;
  accent: string;
  onAccent: string;
};

export const light: Palette = {
  bg: "#FAFAF8",
  ink: "#111111",
  muted: "#6B6B6B",
  hairline: "#D9D9D4",
  accent: "#E10600",
  onAccent: "#FFFFFF",
};

export const dark: Palette = {
  bg: "#111113",
  ink: "#EDEDEA",
  muted: "#9A9A96",
  hairline: "#2E2E33",
  accent: "#FF2D20",
  onAccent: "#FFFFFF",
};

export const fonts = {
  regular: "Archivo_400Regular",
  medium: "Archivo_500Medium",
  bold: "Archivo_700Bold",
  mono: "IBMPlexMono_400Regular",
} as const;

export const type = {
  display: {
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  mono: { fontFamily: fonts.mono, fontSize: 13 },
  kpi: { fontFamily: fonts.bold, fontSize: 48, lineHeight: 56, letterSpacing: -1 },
  kpiWide: { fontFamily: fonts.bold, fontSize: 56, lineHeight: 64, letterSpacing: -1 },
} as const;

export const space = {
  base: 4,
  gutter: 16,
  gutterWide: 24,
  maxWidth: 720,
  breakpoint: 640,
} as const;
