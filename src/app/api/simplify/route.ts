import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGeminiModel } from '@/lib/gemini/client';
import { isAllowed } from '@/lib/gemini/rateLimiter';

const simplifySchema = z.object({
  text: z.string().min(1).max(2000)
});

/**
 * API route to rewrite dense/technical stadium operations text into plain language.
 * Streams the result token-by-token.
 * Falls back to local shortened summaries if the Gemini key is missing.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
  if (!isAllowed(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body;
  try {
    const rawBody = await req.json();
    body = simplifySchema.parse(rawBody);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Invalid parameters';
    return NextResponse.json({ error: errMsg }, { status: 400 });
  }

  const { text } = body;

  try {
    const model = getGeminiModel('gemini-1.5-flash');
    const prompt = `You are an accessibility helper. Rewrite the following text into highly accessible, simple, plain language. 
    Use simple words and shorter sentences suitable for fans with cognitive disabilities or non-native speakers.
    Keep the core information intact.
    
    Original Text:
    "${text}"
    
    Plain Language Version:`;

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(encoder.encode(chunkText));
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.warn('Gemini simplify failed (e.g. invalid key). Falling back to mock simplifier.', error);
    
    // Fallback simply returns a shortened or cleaned version of the text
    const fallbackText = text.length > 100 
      ? `Simplified overview: ${text.substring(0, 120)}... [Active plain-language translation simplified for matches].`
      : `Simplified version: ${text}`;
      
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(fallbackText));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  }
}
