/**
 * A unified logging service for capturing errors and other events.
 * Currently, it logs all errors to the console.
 * Production error reporting (e.g., Sentry) should be handled in the respective app (web/mobile).
 */

interface ErrorContext {
  [key: string]: any;
}

export function logError(error: Error, context?: ErrorContext) {
  console.error('[Logged Error]', error, context ? { context } : '');
}
