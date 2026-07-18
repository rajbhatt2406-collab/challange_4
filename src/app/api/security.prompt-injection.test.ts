import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Spies to capture prompts sent to Gemini
const mockGenerateContent = vi.fn().mockResolvedValue({
  response: {
    text: () => JSON.stringify({
      classification: 'facility_damage',
      recommended_action: 'Deploy maintenance to Gate B.',
      severity: 'medium',
      confidence: 0.94,
      intent: 'FIND_RESTROOM',
      destination_id: 'restroom-n1',
      language_detected: 'en',
      translated_response: 'Sure!'
    })
  }
});

const mockGenerateContentStream = vi.fn().mockResolvedValue({
  stream: [
    { text: () => 'Simplified text output.' }
  ]
});

vi.mock('@/lib/gemini/client', () => {
  return {
    getGeminiModel: () => ({
      generateContent: mockGenerateContent,
      generateContentStream: mockGenerateContentStream
    }),
    sanitizeError: (err: any) => String(err)
  };
});

describe('Security: Prompt Injection Prevention in Gemini Prompts', () => {
  it('simplify route: wraps user text in delimiters', async () => {
    const { POST } = await import('./simplify/route');
    const req = new NextRequest('http://localhost/api/simplify', {
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: JSON.stringify({ text: 'Please simplify my custom instructions.' })
    });
    
    mockGenerateContentStream.mockClear();
    await POST(req);

    expect(mockGenerateContentStream).toHaveBeenCalled();
    const promptArg = mockGenerateContentStream.mock.calls[0][0].contents[0].parts[0].text;
    expect(promptArg).toContain('[START OF USER TEXT TO SIMPLIFY]');
    expect(promptArg).toContain('Please simplify my custom instructions.');
    expect(promptArg).toContain('[END OF USER TEXT TO SIMPLIFY]');
  });

  it('triage route: wraps user description in delimiters', async () => {
    const { POST } = await import('./triage/route');
    const req = new NextRequest('http://localhost/api/triage', {
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: JSON.stringify({ description: 'A fight broke out near gate C.' })
    });

    mockGenerateContent.mockClear();
    await POST(req);

    expect(mockGenerateContent).toHaveBeenCalled();
    const promptArg = mockGenerateContent.mock.calls[0][0].contents[0].parts[0].text;
    expect(promptArg).toContain('[START OF INCIDENT REPORT]');
    expect(promptArg).toContain('A fight broke out near gate C.');
    expect(promptArg).toContain('[END OF INCIDENT REPORT]');
  });

  it('wayfinding route: wraps user query in delimiters in both classification and streaming prompts', async () => {
    const { POST } = await import('./wayfinding/route');
    const req = new NextRequest('http://localhost/api/wayfinding', {
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.1' },
      body: JSON.stringify({ query: 'Where is the restroom?', startNode: 'gate-a' })
    });

    mockGenerateContent.mockClear();
    mockGenerateContentStream.mockClear();
    await POST(req);

    // Classification model call
    expect(mockGenerateContent).toHaveBeenCalled();
    const classificationPrompt = mockGenerateContent.mock.calls[0][0].contents[0].parts[0].text;
    expect(classificationPrompt).toContain('[START OF USER QUERY]');
    expect(classificationPrompt).toContain('Where is the restroom?');
    expect(classificationPrompt).toContain('[END OF USER QUERY]');

    // Directions streaming model call
    expect(mockGenerateContentStream).toHaveBeenCalled();
    const streamingPrompt = mockGenerateContentStream.mock.calls[0][0].contents[0].parts[0].text;
    expect(streamingPrompt).toContain('[START OF USER QUERY]');
    expect(streamingPrompt).toContain('Where is the restroom?');
    expect(streamingPrompt).toContain('[END OF USER QUERY]');
  });
});
