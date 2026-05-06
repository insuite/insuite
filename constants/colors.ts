export const colors = {
  bg: {
    primary: '#0f0e0c',
    secondary: '#141210',
    tertiary: '#1a1810',
    card: '#141210',
  },
  border: {
    default: '#2a2520',
    subtle: '#1e1c18',
    gold: '#c9b98a',
    active: '#3a3020',
  },
  text: {
    primary: '#f0ece4',
    secondary: '#e8d8a8',
    muted: '#7a7060',
    faint: '#5a5040',
    ghost: '#3a3020',
  },
  accent: {
    gold: '#c9b98a',
    goldDark: '#0a0908',
    green: '#6db87a',
    greenBg: '#0d2018',
    red: '#d97566',
    redBg: '#2a1410',
  },
  brand: 'INSUITE',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 32, fontWeight: '300' as const, letterSpacing: 0.5 },
  h2: { fontSize: 24, fontWeight: '400' as const, letterSpacing: 0.3 },
  h3: { fontSize: 18, fontWeight: '500' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  tiny: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 1 },
} as const;
