import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock the Gemini client to return a predictable response
vi.mock('@/lib/gemini/client', () => {
  return {
    getGeminiModel: () => ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            classification: 'facility_damage',
            recommended_action: 'Deploy maintenance to Gate B.',
            severity: 'medium',
            confidence: 0.94
          })
        }
      })
    })
  };
});

// Mock Supabase database insertions
vi.mock('@/lib/supabase/client', () => {
  return {
    insertIncident: vi.fn().mockResolvedValue({
      data: [{
        id: 'inc-mock-123',
        description: 'Broken seat at Row 15 Gate B',
        classification: 'facility_damage',
        recommended_action: 'Deploy maintenance to Gate B.',
        severity: 'medium',
        confidence: 0.94,
        status: 'open',
        created_at: new Date().toISOString()
      }],
      error: null
    })
  };
});

describe('Incident Triage API Integration Test', () => {
  it('should sanitize, validate, and triage a valid report', async () => {
    const request = new NextRequest('http://localhost/api/triage', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '127.0.0.1'
      },
      body: JSON.stringify({
        description: 'Broken seat at Row 15 Gate B'
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.incident).toBeDefined();
    expect(json.incident.id).toBe('inc-mock-123');
    expect(json.incident.classification).toBe('facility_damage');
  });

  it('should fail with 400 when input is too short', async () => {
    const request = new NextRequest('http://localhost/api/triage', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '127.0.0.1'
      },
      body: JSON.stringify({
        description: 'Oops' // Under 5 chars minimum limit
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.error).toBeDefined();
  });
});
