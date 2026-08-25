import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './tokens';

type ActionLensTheme = { colors: ThemeColors; isDark: boolean };
const ThemeContext = createContext<ActionLensTheme>({ colors: lightColors, isDark: false });

export function ActionLensThemeProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();
  const value = useMemo<ActionLensTheme>(() => {
    const isDark = colorScheme === 'dark';
    return { isDark, colors: isDark ? darkColors : lightColors };
  }, [colorScheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ActionLensTheme {
  return useContext(ThemeContext);
}
