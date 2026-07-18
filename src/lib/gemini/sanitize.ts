/**
 * Helper to sanitize error logs and prevent API key exposure.
 */
export function sanitizeError(error: unknown): string {
  let message = error instanceof Error ? error.stack || error.message : String(error);
  // Redact key query parameters or assignments (e.g. ?key=AIzaSy... or apiKey="AIzaSy...")
  message = message.replace(/(key|apiKey)\s*=\s*(["']?)([^&\s"'`\)]+)\2/gi, (_, param) => `${param}=[REDACTED]`);
  // Redact raw Google API keys (AIzaSy...)
  message = message.replace(/AIzaSy[A-Za-z0-9_-]{10,}/g, '[REDACTED]');
  return message;
}
