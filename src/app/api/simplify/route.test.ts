import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock Gemini client with generateContentStream
vi.mock('@/lib/gemini/client', () => {
  return {
    getGeminiModel: () => ({
      generateContentStream: vi.fn().mockResolvedValue({
        stream: [
          { text: () => 'Simplified ' },
          { text: () => 'text output.' }
        ]
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

describe('Simplify API Integration Test', () => {
  it('should stream the simplified response for a valid text input', async () => {
    const request = new NextRequest('http://localhost/api/simplify', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '127.0.0.1'
      },
      body: JSON.stringify({
        text: 'This is a very dense operations message about stadium gates.'
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');

    const text = await response.text();
    expect(text).toBe('Simplified text output.');
  });

  it('should reject with 400 status if input text is empty', async () => {
    const request = new NextRequest('http://localhost/api/simplify', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '127.0.0.1'
      },
      body: JSON.stringify({
        text: ''
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('should reject with 400 status if input text exceeds 2000 characters', async () => {
    const longText = 'a'.repeat(2001);
    const request = new NextRequest('http://localhost/api/simplify', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '127.0.0.1'
      },
      body: JSON.stringify({
        text: longText
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('should reject with 429 status when rate limited', async () => {
    const request = new NextRequest('http://localhost/api/simplify', {
      method: 'POST',
      headers: {
        'x-forwarded-for': 'rate-limited-ip'
      },
      body: JSON.stringify({
        text: 'Please simplify this.'
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(429);

    const json = await response.json();
    expect(json.error).toBe('Too many requests');
  });
});
