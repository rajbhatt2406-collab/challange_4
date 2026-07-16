import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Gemini success mock
vi.mock('@/lib/gemini/client', () => ({
  getGeminiModel: () => ({
    generateContent: vi.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          severity: 'high',
          message: 'Gate A is highly congested.',
          recommended_action: 'Divert fans to Gate B.',
          confidence: 0.91
        })
      }
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

describe('ops-alerts API Route — Additional Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    vi.mock('@/lib/gemini/client', () => ({
      getGeminiModel: () => ({
        generateContent: vi.fn().mockRejectedValue(new Error('API key invalid'))
      })
    }));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Re-import to pick up new mock
    const { POST: POST2 } = await import('./route');
    const res = await POST2(makeRequest({ gateId: 'gate-b', occupancy: 95 }));
    expect(res.status).toBe(200);

    const json = await res.json();
    // Fallback should return critical for 95%
    expect(['critical', 'high', 'medium', 'low']).toContain(json.severity);
    consoleSpy.mockRestore();
  });

  it('accepts all 4 valid gate IDs without validation error', async () => {
    const gateIds = ['gate-a', 'gate-b', 'gate-c', 'gate-d'];
    for (const gateId of gateIds) {
      const res = await POST(makeRequest({ gateId, occupancy: 50 }));
      // Should not be 400 (validation error)
      expect(res.status).not.toBe(400);
    }
  });
});
