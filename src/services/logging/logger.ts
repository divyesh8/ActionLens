type SafeLogValue = string | number | boolean | null | undefined;
type SafeLogContext = Record<string, SafeLogValue>;
const blockedKey = /(token|secret|password|document|source|ocr|content|signed.?url)/i;

function sanitize(context: SafeLogContext | undefined): SafeLogContext | undefined {
  if (!context) return undefined;
  return Object.fromEntries(Object.entries(context).map(([key, value]) => [key, blockedKey.test(key) ? '[redacted]' : value]));
}

export const logger = {
  info(message: string, context?: SafeLogContext) { if (__DEV__) console.warn(`[info] ${message}`, sanitize(context)); },
  warn(message: string, context?: SafeLogContext) { console.warn(`[warn] ${message}`, sanitize(context)); },
  error(message: string, context?: SafeLogContext) { console.error(`[error] ${message}`, sanitize(context)); },
};
