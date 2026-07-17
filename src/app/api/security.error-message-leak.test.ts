import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Security regression tests: validate that all API routes return a generic error message
 * on invalid input, rather than leaking internal Zod schema details (field paths, enum
 * values, etc.).
 *
 * Audit finding: GAP (f) — ERROR HANDLING
 * Zod v4 ZodError.message serializes the full structured error including field paths
 * (e.g., "path": ["gateId"]) and allowed enum values (e.g., "values": ["gate-a", ...]).
 * Returning err.message verbatim exposes internal schema structure to clients.
 *
 * Fix applied: all 6 API routes now return { error: 'Invalid request parameters.' }
 * for any Zod parse failure, regardless of the specific field or message.
 */

// ---- Shared mock for Gemini (all routes need it imported) ----
vi.mock('@/lib/gemini/client', () => ({
  getGeminiModel: () => ({
    generateContent: vi.fn().mockResolvedValue({
      response: { text: () => JSON.stringify({ severity: 'low', message: 'ok', recommended_action: 'none', confidence: 0.5 }) }
    }),
    generateContentStream: vi.fn().mockResolvedValue({
      stream: [{ text: () => 'ok' }]
    })
  })
}));

const GENERIC_ERROR = 'Invalid request parameters.';

// Helper to assert a response body contains only the generic error string
async function assertGenericError(res: Response) {
  const json = await res.json();
  expect(res.status).toBe(400);
  // The error field must be exactly our generic message
  expect(json.error).toBe(GENERIC_ERROR);
  // Must NOT contain any internal Zod schema details
  expect(json.error).not.toMatch(/path/i);
  expect(json.error).not.toMatch(/values/i);
  expect(json.error).not.toMatch(/gate-[a-z]/i);
  expect(json.error).not.toMatch(/shuttle/i);
  expect(json.error).not.toMatch(/description/i);
  expect(json.error).not.toMatch(/transportMode/i);
}

describe('Security: API routes do NOT leak schema details in 400 error responses', () => {
  it('ops-alerts: invalid gateId returns generic error, not Zod path', async () => {
    const { POST } = await import('@/app/api/ops-alerts/route');
    const req = new NextRequest('http://localhost/api/ops-alerts', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.1' },
      body: JSON.stringify({ gateId: 'gate-INVALID_INTERNAL_ENUM', occupancy: 50 })
    });
    const res = await POST(req);
    await assertGenericError(res);
  });

  it('ops-alerts: missing body returns generic error', async () => {
    const { POST } = await import('@/app/api/ops-alerts/route');
    const req = new NextRequest('http://localhost/api/ops-alerts', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.1' },
      body: JSON.stringify({})
    });
    const res = await POST(req);
    await assertGenericError(res);
  });

  it('transport-alerts: unknown transportId returns generic error, not enum list', async () => {
    const { POST } = await import('@/app/api/transport-alerts/route');
    const req = new NextRequest('http://localhost/api/transport-alerts', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.2' },
      body: JSON.stringify({ transportId: 'internal-sector-99', occupancy: 50 })
    });
    const res = await POST(req);
    await assertGenericError(res);
  });

  it('sustainability: invalid transportMode returns generic error, not schema enum', async () => {
    const { POST } = await import('@/app/api/sustainability/route');
    const req = new NextRequest('http://localhost/api/sustainability', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.3' },
      body: JSON.stringify({ transportMode: 'helicopter' })
    });
    const res = await POST(req);
    await assertGenericError(res);
  });

  it('simplify: empty text returns generic error, not field path', async () => {
    const { POST } = await import('@/app/api/simplify/route');
    const req = new NextRequest('http://localhost/api/simplify', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.4' },
      body: JSON.stringify({ text: '' })
    });
    const res = await POST(req);
    await assertGenericError(res);
  });

  it('triage: too-short description returns generic error, not field path', async () => {
    const { POST } = await import('@/app/api/triage/route');
    const req = new NextRequest('http://localhost/api/triage', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.5' },
      body: JSON.stringify({ description: 'ab' })
    });
    const res = await POST(req);
    await assertGenericError(res);
  });

  it('wayfinding: invalid startNode returns generic error, not venue node list', async () => {
    const { POST } = await import('@/app/api/wayfinding/route');
    const req = new NextRequest('http://localhost/api/wayfinding', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.6' },
      body: JSON.stringify({ query: 'Where is the exit?', startNode: 'INTERNAL-NODE-XYZ' })
    });
    const res = await POST(req);
    await assertGenericError(res);
  });
});
