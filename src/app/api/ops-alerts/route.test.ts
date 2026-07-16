import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock the Gemini client
vi.mock('@/lib/gemini/client', () => {
  return {
    getGeminiModel: () => ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            severity: 'critical',
            message: 'Gate B is highly overcrowded!',
            recommended_action: 'Divert spectators to Gate C.',
            confidence: 0.98
          })
        }
      })
    })
  };
});

// Mock the rate limiter to allow testing 429s
vi.mock('@/lib/gemini/rateLimiter', () => {
  return {
    isAllowed: vi.fn().mockImplementation((ip: string) => {
      if (ip === 'rate-limited-ip') {
        return false;
      }
      return true;
    })
  };
});

describe('Ops Alerts API Integration Test', () => {
  it('should return a structured alert response for a valid threshold breach', async () => {
    const request = new NextRequest('http://localhost/api/ops-alerts', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '127.0.0.1'
      },
      body: JSON.stringify({
        gateId: 'gate-b',
        occupancy: 92
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.severity).toBe('critical');
    expect(json.message).toContain('overcrowded');
    expect(json.recommended_action).toBe('Divert spectators to Gate C.');
    expect(json.confidence).toBe(0.98);
  });

  it('should reject with 400 status for malformed/invalid payload', async () => {
    const request = new NextRequest('http://localhost/api/ops-alerts', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '127.0.0.1'
      },
      body: JSON.stringify({
        gateId: '', // invalid: empty
        occupancy: 150 // invalid: > 100
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('should reject with 429 status when rate limit is exceeded', async () => {
    const request = new NextRequest('http://localhost/api/ops-alerts', {
      method: 'POST',
      headers: {
        'x-forwarded-for': 'rate-limited-ip'
      },
      body: JSON.stringify({
        gateId: 'gate-a',
        occupancy: 88
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(429);

    const json = await response.json();
    expect(json.error).toBe('Too many requests');
  });
});
