import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

let shouldMockFail = false;

vi.mock('@/lib/gemini/client', () => ({
  getGeminiModel: () => ({
    generateContent: vi.fn().mockImplementation(() => {
      if (shouldMockFail) {
        return Promise.reject(new Error('No key'));
      }
      return Promise.resolve({
        response: {
          text: () => JSON.stringify({
            estimate: '0.05 kg CO2',
            comparison: 'Train travel reduces emissions by 85% compared to solo vehicles.'
          })
        }
      });
    })
  })
}));

function makeRequest(body: object, ip = '10.0.0.90') {
  return new NextRequest('http://localhost/api/sustainability', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: JSON.stringify(body)
  });
}

describe('sustainability API Route — Additional Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shouldMockFail = false;
  });

  it('returns valid CO2 estimate for train mode', async () => {
    const res = await POST(makeRequest({ transportMode: 'train' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.estimate).toBeDefined();
    expect(json.comparison).toBeDefined();
  });

  it('returns 400 for invalid transport mode', async () => {
    const res = await POST(makeRequest({ transportMode: 'helicopter' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing transportMode field', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('accepts all 4 valid transport modes', async () => {
    const modes = ['train', 'shuttle', 'carpool', 'solo_vehicle'];
    for (const transportMode of modes) {
      const res = await POST(makeRequest({ transportMode }));
      expect(res.status).not.toBe(400);
    }
  });

  it('fallback returns distinct estimates per mode', async () => {
    shouldMockFail = true;
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const trainRes = await POST(makeRequest({ transportMode: 'train' }));
    const soloRes = await POST(makeRequest({ transportMode: 'solo_vehicle' }));

    const trainJson = await trainRes.json();
    const soloJson = await soloRes.json();

    // Solo vehicle should have higher CO2 than train in fallback
    expect(trainJson.estimate).toBeDefined();
    expect(soloJson.estimate).toBeDefined();
    // The estimates should be different (solo is higher)
    expect(trainJson.estimate).not.toBe(soloJson.estimate);

    consoleSpy.mockRestore();
  });

  it('response includes both estimate and comparison keys', async () => {
    const res = await POST(makeRequest({ transportMode: 'carpool' }));
    const json = await res.json();
    expect(Object.keys(json)).toContain('estimate');
    expect(Object.keys(json)).toContain('comparison');
  });
});
