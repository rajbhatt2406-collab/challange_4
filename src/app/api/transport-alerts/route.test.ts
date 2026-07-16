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
            severity: 'high',
            message: 'Lot A Shuttle is highly congested!',
            recommended_action: 'Redirect fans to Lot E and deploy support buses.',
            confidence: 0.97
          })
        }
      })
    })
  };
});

// Mock the rate limiter
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

describe('Transport Alerts API Integration Test', () => {
  it('should return a structured alert response for a valid transport congestion trigger', async () => {
    const request = new NextRequest('http://localhost/api/transport-alerts', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '127.0.0.1'
      },
      body: JSON.stringify({
        transportId: 'shuttle-express',
        occupancy: 90
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.severity).toBe('high');
    expect(json.message).toContain('congested');
    expect(json.recommended_action).toBe('Redirect fans to Lot E and deploy support buses.');
    expect(json.confidence).toBe(0.97);
  });

  it('should reject with 400 status for malformed/invalid payload', async () => {
    const request = new NextRequest('http://localhost/api/transport-alerts', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '127.0.0.1'
      },
      body: JSON.stringify({
        transportId: '', // invalid: empty
        occupancy: -5 // invalid: < 0
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('should reject with 429 status when rate limit is exceeded', async () => {
    const request = new NextRequest('http://localhost/api/transport-alerts', {
      method: 'POST',
      headers: {
        'x-forwarded-for': 'rate-limited-ip'
      },
      body: JSON.stringify({
        transportId: 'lot-east',
        occupancy: 86
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(429);

    const json = await response.json();
    expect(json.error).toBe('Too many requests');
  });
});
