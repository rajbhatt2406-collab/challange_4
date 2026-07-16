import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

vi.mock('@/lib/gemini/client', () => ({
  getGeminiModel: () => ({
    generateContent: vi.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          severity: 'critical',
          message: 'Shuttle express is at maximum capacity.',
          recommended_action: 'Deploy 3 additional buses.',
          confidence: 0.95
        })
      }
    })
  })
}));

function makeRequest(body: object, ip = '10.0.0.60') {
  return new NextRequest('http://localhost/api/transport-alerts', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: JSON.stringify(body)
  });
}

describe('transport-alerts API Route — Additional Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 for valid shuttle-express at 95% occupancy', async () => {
    const res = await POST(makeRequest({ transportId: 'shuttle-express', occupancy: 95 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.severity).toBe('critical');
    expect(json.recommended_action).toBeDefined();
  });

  it('returns 400 for unknown transportId not in whitelist', async () => {
    const res = await POST(makeRequest({ transportId: 'helipad-1', occupancy: 80 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for occupancy > 100', async () => {
    const res = await POST(makeRequest({ transportId: 'lot-west', occupancy: 110 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing body', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('accepts all 4 valid transport sector IDs', async () => {
    const ids = ['shuttle-express', 'shuttle-regional', 'lot-west', 'lot-east'];
    for (const transportId of ids) {
      const res = await POST(makeRequest({ transportId, occupancy: 60 }));
      expect(res.status).not.toBe(400);
    }
  });

  it('fallback returns valid severity for 80% occupancy (medium threshold)', async () => {
    vi.mock('@/lib/gemini/client', () => ({
      getGeminiModel: () => ({
        generateContent: vi.fn().mockRejectedValue(new Error('Gemini down'))
      })
    }));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { POST: POST2 } = await import('./route');
    const res = await POST2(makeRequest({ transportId: 'lot-east', occupancy: 80 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(['low', 'medium', 'high', 'critical']).toContain(json.severity);
    consoleSpy.mockRestore();
  });
});
