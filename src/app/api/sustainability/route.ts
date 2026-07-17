import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGeminiModel } from '@/lib/gemini/client';
import { isAllowed } from '@/lib/gemini/rateLimiter';
import { Schema } from '@google/generative-ai';

const sustainabilitySchema = z.object({
  transportMode: z.enum(['train', 'shuttle', 'carpool', 'solo_vehicle'])
});

/**
 * Endpoint to analyze transit carbon footprints for the FIFA World Cup 2026.
 * Uses Gemini Structured JSON schemas.
 * Falls back to static calculations if the Gemini key is missing.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
  if (!isAllowed(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body;
  try {
    const rawBody = await req.json();
    body = sustainabilitySchema.parse(rawBody);
  } catch (err) {
    // Security: return a generic message to avoid leaking internal schema details
    // (Zod v4 ZodError.message includes field paths and allowed enum values)
    void err;
    return NextResponse.json({ error: 'Invalid request parameters.' }, { status: 400 });
  }

  const { transportMode } = body;

  try {
    const model = getGeminiModel('gemini-1.5-flash');

    const schema = {
      type: 'OBJECT',
      properties: {
        estimate: {
          type: 'STRING',
          description: 'Approximate CO2 emission per passenger-mile (e.g. "0.05 kg CO2" or "0.41 kg CO2").'
        },
        comparison: {
          type: 'STRING',
          description: 'A 1-2 sentence eco comparison comparing this transit choice against single occupancy vehicles.'
        }
      },
      required: ['estimate', 'comparison']
    } as unknown as Schema;

    const prompt = `Analyze the sustainability and carbon footprint of transit choice "${transportMode}" for a fan attending the FIFA World Cup 2026 at MetLife Stadium.
    Provide a realistic emissions estimate per passenger-mile and a 1-2 sentence comparison.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    });

    const textOutput = result.response.text();
    if (!textOutput) {
      throw new Error('Empty response from model');
    }

    const parsedResponse = JSON.parse(textOutput);
    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.warn('Gemini sustainability failed (e.g. invalid key). Falling back to mock values.', error);

    let estimate = '0.05 kg CO2';
    let comparison = 'Taking the Metrolink mass transit train saves around 85% carbon output compared to traveling by solo car.';

    if (transportMode === 'shuttle') {
      estimate = '0.12 kg CO2';
      comparison = 'Taking electric shuttles cuts direct street-level emissions and decreases traffic congestion.';
    } else if (transportMode === 'carpool') {
      estimate = '0.18 kg CO2';
      comparison = 'Carpooling with 3+ passengers splits vehicle emissions by three, reducing regional grid carbon.';
    } else if (transportMode === 'solo_vehicle') {
      estimate = '0.41 kg CO2';
      comparison = 'Solo vehicles have the highest per-passenger footprint. Consider choosing shuttles or trains next time.';
    }

    return NextResponse.json({ estimate, comparison });
  }
}
