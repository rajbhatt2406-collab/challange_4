import { describe, it, expect } from 'vitest';
import { sanitizeError } from './sanitize';

describe('sanitizeError log security utility', () => {
  it('should redact raw Gemini API keys starting with AIzaSy', () => {
    const errorWithRawKey = new Error('Failed to fetch from key: AIzaSyabcdefghijklmnopqrstuvwxyz123456789');
    const sanitized = sanitizeError(errorWithRawKey);
    expect(sanitized).not.toContain('AIzaSy');
    expect(sanitized).toContain('[REDACTED]');
  });

  it('should redact API keys from query parameters in URLs', () => {
    const urlError = new Error('HTTP failure requesting https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSySecretApiKey12345');
    const sanitized = sanitizeError(urlError);
    expect(sanitized).not.toContain('AIzaSySecretApiKey12345');
    expect(sanitized).toContain('key=[REDACTED]');
  });

  it('should redact apiKey parameter in error strings', () => {
    const stringError = 'Failed authentication with apiKey="AIzaSySecretKey" in client config';
    const sanitized = sanitizeError(stringError);
    expect(sanitized).not.toContain('AIzaSySecretKey');
    expect(sanitized).toContain('apiKey=[REDACTED]');
  });

  it('should leave non-sensitive error messages unchanged', () => {
    const safeError = new Error('Network timeout trying to connect to standard server.');
    const sanitized = sanitizeError(safeError);
    expect(sanitized).toContain('Network timeout');
    expect(sanitized).not.toContain('[REDACTED]');
  });
});
