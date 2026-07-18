import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

let shouldMockFail = false;

vi.mock('@/lib/gemini/rateLimiter', () => ({
  isAllowed: () => true
}));

vi.mock('@/lib/gemini/client', () => ({
  getGeminiModel: () => ({
    generateContent: vi.fn().mockImplementation(() => {
      if (shouldMockFail) {
        return Promise.reject(new Error('API key invalid'));
      }
      return Promise.resolve({
        response: {
          text: () => JSON.stringify({
            severity: 'high',
            message: 'Gate A is highly congested.',
            recommended_action: 'Divert fans to Gate B.',
            confidence: 0.91
          })
        }
      });
    })
  })
}));

// Helper to create a request
function makeRequest(body: object, ip = '10.0.0.50') {
  return new NextRequest('http://localhost/api/ops-alerts', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: JSON.stringify(body)
  });
}

describe('ops-alerts API Route — Additional Coverage & Boundary Conditions', () => {
  let consoleSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    shouldMockFail = false;
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('returns 200 with Gemini structured response for valid gate-a input', async () => {
    const res = await POST(makeRequest({ gateId: 'gate-a', occupancy: 90 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.severity).toBe('high');
    expect(json.message).toBeDefined();
    expect(json.recommended_action).toBeDefined();
  });

  it('returns 400 for unknown gateId (not in whitelist)', async () => {
    const res = await POST(makeRequest({ gateId: 'gate-z', occupancy: 90 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for occupancy over 100', async () => {
    const res = await POST(makeRequest({ gateId: 'gate-a', occupancy: 150 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for occupancy below 0', async () => {
    const res = await POST(makeRequest({ gateId: 'gate-a', occupancy: -5 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing body fields', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('falls back to deterministic response when Gemini throws', async () => {
    shouldMockFail = true;

    const res = await POST(makeRequest({ gateId: 'gate-b', occupancy: 95 }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.severity).toBe('critical');
  });

  it('accepts all 4 valid gate IDs without validation error', async () => {
    const gateIds = ['gate-a', 'gate-b', 'gate-c', 'gate-d'];
    for (const gateId of gateIds) {
      const res = await POST(makeRequest({ gateId, occupancy: 50 }));
      expect(res.status).not.toBe(400);
    }
  });

  describe('Fallback Classifier Boundary Conditions', () => {
    beforeEach(() => {
      shouldMockFail = true;
    });

    it('returns critical severity at exactly 95% occupancy', async () => {
      const res = await POST(makeRequest({ gateId: 'gate-a', occupancy: 95 }));
      const json = await res.json();
      expect(json.severity).toBe('critical');
    });

    it('returns high severity at exactly 94% occupancy', async () => {
      const res = await POST(makeRequest({ gateId: 'gate-a', occupancy: 94 }));
      const json = await res.json();
      expect(json.severity).toBe('high');
    });

    it('returns high severity at exactly 85% occupancy', async () => {
      const res = await POST(makeRequest({ gateId: 'gate-a', occupancy: 85 }));
      const json = await res.json();
      expect(json.severity).toBe('high');
    });

    it('returns medium severity at exactly 84% occupancy', async () => {
      const res = await POST(makeRequest({ gateId: 'gate-a', occupancy: 84 }));
      const json = await res.json();
      expect(json.severity).toBe('medium');
    });

    it('returns medium severity at exactly 80% occupancy', async () => {
      const res = await POST(makeRequest({ gateId: 'gate-a', occupancy: 80 }));
      const json = await res.json();
      expect(json.severity).toBe('medium');
    });

    it('returns low severity at exactly 79% occupancy', async () => {
      const res = await POST(makeRequest({ gateId: 'gate-a', occupancy: 79 }));
      const json = await res.json();
      expect(json.severity).toBe('low');
    });
  });
});
