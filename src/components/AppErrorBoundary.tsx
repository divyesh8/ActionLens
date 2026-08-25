import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/design-system/AppText';
import { Button } from '@/design-system/Button';
import { lightColors, spacing } from '@/design-system/tokens';
import { logger } from '@/services/logging/logger';

type State = { failed: boolean };

export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { logger.error('Unhandled application error', { errorName: error.name, componentStackPresent: Boolean(info.componentStack) }); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <View style={styles.container}><AppText variant="title" align="center">ActionLens hit a problem</AppText><AppText color={lightColors.textMuted} align="center">Your saved information is safe. Try reopening this screen.</AppText><Button label="Try again" onPress={() => this.setState({ failed: false })} /></View>;
  }
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: lightColors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md } });
