import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

let shouldMockFail = false;

// Default mock: Gemini returns success or fails dynamically
vi.mock('@/lib/gemini/client', () => ({
  getGeminiModel: () => ({
    generateContent: vi.fn().mockImplementation(() => {
      if (shouldMockFail) {
        return Promise.reject(new Error('No API key'));
      }
      return Promise.resolve({
        response: {
          text: () => JSON.stringify({
            intent: 'FIND_RESTROOM',
            destination_id: 'restroom-n1',
            language_detected: 'en',
            translated_response: 'I will guide you to the restroom.'
          })
        }
      });
    }),
    generateContentStream: vi.fn().mockImplementation(() => {
      if (shouldMockFail) {
        return Promise.reject(new Error('No API key'));
      }
      return Promise.resolve({
        stream: [{ text: () => 'Head north toward Section 112.' }]
      });
    })
  })
}));

function makeRequest(body: object, ip = '10.0.0.70') {
  return new NextRequest('http://localhost/api/wayfinding', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: JSON.stringify(body)
  });
}

describe('wayfinding API Route — Additional Coverage', () => {
  let consoleSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    shouldMockFail = false;
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('returns 400 when query exceeds 500 characters', async () => {
    const longQuery = 'x'.repeat(501);
    const response = await POST(new NextRequest('http://localhost/api/wayfinding', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.70' },
      body: JSON.stringify({ query: longQuery, startNode: 'gate-a' })
    }));
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid startNode not in venue graph', async () => {
    const response = await POST(makeRequest({ query: 'Where is the restroom?', startNode: 'not-a-real-node' }));
    expect(response.status).toBe(400);
  });

  it('returns x-intent, x-destination-id, x-language-detected headers on success', async () => {
    const response = await POST(makeRequest({ query: 'Where is the restroom?', startNode: 'gate-a' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-intent')).toBe('FIND_RESTROOM');
    expect(response.headers.get('x-destination-id')).toBe('restroom-n1');
    expect(response.headers.get('x-language-detected')).toBe('en');
  });

  it('fallback: detects Spanish query and returns es language', async () => {
    shouldMockFail = true;

    const response = await POST(makeRequest({ query: '¿Dónde está el baño?', startNode: 'gate-a' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-language-detected')).toBe('es');
  });

  it('fallback: detects French query', async () => {
    shouldMockFail = true;

    const response = await POST(makeRequest({ query: 'Où sont les toilettes?', startNode: 'gate-a' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-language-detected')).toBe('fr');
  });

  it('returns 400 for empty query string', async () => {
    const response = await POST(makeRequest({ query: '', startNode: 'gate-a' }));
    expect(response.status).toBe(400);
  });
});
