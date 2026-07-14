import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock the Gemini client to simulate successful function calls
vi.mock('@/lib/gemini/client', () => {
  return {
    getGeminiModel: () => ({
      // Mock generateContent for classification
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            intent: 'FIND_RESTROOM',
            destination_id: 'restroom-acc-s1',
            language_detected: 'es',
            translated_response: 'Claro, te guiaré al baño.'
          })
        }
      }),
      // Mock generateContentStream for direction streams
      generateContentStream: vi.fn().mockResolvedValue({
        stream: [
          { text: () => 'Sigue recto hacia la sección 134.' }
        ]
      })
    })
  };
});

describe('Wayfinding API Integration Route', () => {
  it('should process wayfinding requests and return custom headers and stream', async () => {
    const request = new NextRequest('http://localhost/api/wayfinding', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '127.0.0.1'
      },
      body: JSON.stringify({
        query: '¿Dónde está el baño accesible?',
        startNode: 'gate-a'
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify headers from Gemini Function Calling output
    expect(response.headers.get('x-intent')).toBe('FIND_RESTROOM');
    expect(response.headers.get('x-destination-id')).toBe('restroom-acc-s1');
    expect(response.headers.get('x-language-detected')).toBe('es');

    const bodyText = await response.text();
    expect(bodyText).toContain('Sigue recto');
  });

  it('should return 400 error for empty queries', async () => {
    const request = new NextRequest('http://localhost/api/wayfinding', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '127.0.0.1'
      },
      body: JSON.stringify({
        query: '' // invalid empty string
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });
});
