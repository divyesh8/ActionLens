import { type ComponentProps } from 'react';
import { Text, type TextStyle } from 'react-native';

import { typography } from './tokens';
import { useAppTheme } from './theme';

type Props = ComponentProps<typeof Text> & {
  variant?: keyof typeof typography;
  color?: string;
  align?: TextStyle['textAlign'];
};

export function AppText({ variant = 'body', color, align, style, ...props }: Props) {
  const { colors } = useAppTheme();
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.7}
      style={[typography[variant], { color: color ?? colors.text, textAlign: align }, style]}
      {...props}
    />
  );
}
