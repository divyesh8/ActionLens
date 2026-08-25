export const palette = {
  ink: '#151A2D',
  navy: '#0B1020',
  accent: '#6956E8',
  accentLight: '#ECE9FF',
  confirmed: '#21845A',
  amber: '#B56B13',
  danger: '#C53B4C',
  white: '#FFFFFF',
} as const;

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceRaised: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
};

export const lightColors: ThemeColors = {
  background: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  text: palette.ink,
  textMuted: '#667085',
  border: '#E2E5EC',
  accent: palette.accent,
  accentSoft: palette.accentLight,
  accentText: '#FFFFFF',
  success: palette.confirmed,
  successSoft: '#E4F4EC',
  warning: palette.amber,
  warningSoft: '#FFF1D9',
  danger: palette.danger,
  dangerSoft: '#FCE7EA',
  overlay: 'rgba(11, 16, 32, 0.54)',
};

export const darkColors: ThemeColors = {
  background: '#0B1020',
  surface: '#141A2B',
  surfaceRaised: '#1A2135',
  text: '#F7F7FA',
  textMuted: '#AAB2C5',
  border: '#2A3248',
  accent: '#9284FF',
  accentSoft: '#29234E',
  accentText: '#0B1020',
  success: '#62C895',
  successSoft: '#173829',
  warning: '#F2B45F',
  warningSoft: '#3B2B18',
  danger: '#FF8090',
  dangerSoft: '#431E27',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radii = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export const typography = {
  display: { fontSize: 36, lineHeight: 42, fontWeight: '700' as const },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  metadata: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const },
} as const;
