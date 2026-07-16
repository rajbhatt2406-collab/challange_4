import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock Gemini client
vi.mock('@/lib/gemini/client', () => {
  return {
    getGeminiModel: () => ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            estimate: '0.04 kg CO2 per passenger-mile',
            comparison: 'Taking the electric train reduces carbon footprint by up to 90%.'
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

describe('Sustainability API Integration Test', () => {
  it('should return eco comparison and estimates for a valid transport mode', async () => {
    const request = new NextRequest('http://localhost/api/sustainability', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '127.0.0.1'
      },
      body: JSON.stringify({
        transportMode: 'train'
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.estimate).toBe('0.04 kg CO2 per passenger-mile');
    expect(json.comparison).toContain('reduces carbon footprint');
  });

  it('should reject with 400 status for invalid transport mode enum value', async () => {
    const request = new NextRequest('http://localhost/api/sustainability', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '127.0.0.1'
      },
      body: JSON.stringify({
        transportMode: 'helicopter' // invalid enum value
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('should reject with 429 status when rate limited', async () => {
    const request = new NextRequest('http://localhost/api/sustainability', {
      method: 'POST',
      headers: {
        'x-forwarded-for': 'rate-limited-ip'
      },
      body: JSON.stringify({
        transportMode: 'carpool'
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(429);

    const json = await response.json();
    expect(json.error).toBe('Too many requests');
  });
});
