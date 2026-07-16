import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

// Default Gemini mock
vi.mock('@/lib/gemini/client', () => ({
  getGeminiModel: () => ({
    generateContent: vi.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          classification: 'security_breach',
          recommended_action: 'Deploy guards.',
          severity: 'critical',
          confidence: 0.97
        })
      }
    })
  })
}));

vi.mock('@/lib/supabase/client', () => ({
  insertIncident: vi.fn().mockResolvedValue({
    data: [{
      id: 'inc-test-001',
      description: 'A fight broke out near Gate D',
      classification: 'security_breach',
      recommended_action: 'Deploy guards.',
      severity: 'critical',
      confidence: 0.97,
      status: 'open',
      created_at: new Date().toISOString()
    }],
    error: null
  })
}));

function makeRequest(body: object, ip = '10.0.0.80') {
  return new NextRequest('http://localhost/api/triage', {
    method: 'POST',
    headers: { 'x-forwarded-for': ip },
    body: JSON.stringify(body)
  });
}

describe('triage API Route — Additional Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('classifies security_breach correctly via Gemini', async () => {
    const res = await POST(makeRequest({ description: 'A fight broke out near Gate D' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.incident.id).toBe('inc-test-001');
  });

  it('returns 400 for description under 5 characters', async () => {
    const res = await POST(makeRequest({ description: 'Hi' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty description', async () => {
    const res = await POST(makeRequest({ description: '' }));
    expect(res.status).toBe(400);
  });

  it('classifies crowd-related incident via the triage route', async () => {
    // Reuse the top-level security_breach mock — verify route handles a different description
    const res = await POST(makeRequest({ description: 'Crowd crush at turnstile near Gate C' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.incident).toBeDefined();
    // The route should have persisted the incident (mock classification)  
    expect(json.incident.classification).toBe('security_breach'); // from Gemini mock
  });

  it('returns 400 for missing description field', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('description at exactly 5 characters passes validation', async () => {
    const res = await POST(makeRequest({ description: 'Smoke' }));
    // Should not return 400 validation error
    expect(res.status).not.toBe(400);
  });
});
