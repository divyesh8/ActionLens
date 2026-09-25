export function hasActiveNetworkConnection(state: { isConnected?: boolean }): boolean {
  return state.isConnected !== false;
}
