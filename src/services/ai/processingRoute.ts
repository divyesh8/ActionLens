export function shouldProcessLocally(platform: string, mimeType: string): boolean {
  return platform === 'web' || mimeType === 'text/plain' || mimeType.startsWith('image/');
}
