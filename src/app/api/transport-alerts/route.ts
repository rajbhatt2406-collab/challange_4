import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGeminiModel } from '@/lib/gemini/client';
import { isAllowed } from '@/lib/gemini/rateLimiter';
import { Schema } from '@google/generative-ai';

const transportAlertRequestSchema = z.object({
  transportId: z.string().min(1),
  occupancy: z.number().min(0).max(100)
});

/**
 * Endpoint called when shuttle route or parking lot occupancy crosses safety/congestion thresholds.
 * Evaluates transit redirection and capacity hazards using Gemini structured analysis.
 * Features a fallback evaluator in case the Gemini API Key is missing.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
  if (!isAllowed(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body;
  try {
    const rawBody = await req.json();
    body = transportAlertRequestSchema.parse(rawBody);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Invalid parameters';
    return NextResponse.json({ error: errMsg }, { status: 400 });
  }

  const { transportId, occupancy } = body;

  try {
    const model = getGeminiModel('gemini-1.5-flash');

    const alertSchema = {
      type: 'OBJECT',
      properties: {
        severity: {
          type: 'STRING',
          description: 'The classified severity of the crowd size or congestion. Must be low, medium, high, or critical.',
          enum: ['low', 'medium', 'high', 'critical']
        },
        message: {
          type: 'STRING',
          description: 'A 1-sentence warning message explaining the occupancy or congestion level.'
        },
        recommended_action: {
          type: 'STRING',
          description: 'A clear operational action for stadium transit/parking staff (e.g. redirect cars to Lot F, dispatch extra shuttles).'
        },
        confidence: {
          type: 'NUMBER',
          description: 'A confidence score between 0.0 and 1.0.'
        }
      },
      required: ['severity', 'message', 'recommended_action', 'confidence']
    } as unknown as Schema;

    const prompt = `Evaluate the transit and parking safety / congestion level for FIFA World Cup 2026.
    Transport Sector/Route: "${transportId}"
    Current occupancy: ${occupancy}%.
    If occupancy is under 80%, severity should be low.
    If occupancy is 80-89%, severity should be medium/high.
    If occupancy is 90% or higher, severity should be critical.
    Generate a warning message and recommended operational action (e.g., dispatch extra shuttles or redirect traffic).`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: alertSchema
      }
    });

    const textOutput = result.response.text();
    if (!textOutput) {
      throw new Error('Empty response from model');
    }

    const parsedResponse = JSON.parse(textOutput);
    return NextResponse.json(parsedResponse);

  } catch (error) {
    console.warn('Gemini transport evaluation failed (e.g. invalid key). Falling back to mock evaluator.', error);
    
    // Hardcoded fallback safety/congestion limits
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let message = `Occupancy at transport sector ${transportId} is normal.`;
    let recommended_action = 'No dispatch action required.';

    if (occupancy >= 95) {
      severity = 'critical';
      message = `CRITICAL congestion alert at ${transportId}! Sensor reports ${occupancy}% capacity.`;
      recommended_action = 'Close sector entrance, redirect arriving traffic to Lot E, and dispatch 3 additional support buses.';
    } else if (occupancy >= 85) {
      severity = 'high';
      message = `High occupancy warning at ${transportId} (${occupancy}% capacity).`;
      recommended_action = 'Post alert on highway dynamic message signs and prepare overflow Lot F.';
    } else if (occupancy >= 80) {
      severity = 'medium';
      message = `Moderate congestion alert at ${transportId} (${occupancy}% capacity).`;
      recommended_action = 'Deploy transit staff to monitor incoming flows and manage line queuing.';
    }

    return NextResponse.json({
      severity,
      message,
      recommended_action,
      confidence: 0.99
    });
  }
}
