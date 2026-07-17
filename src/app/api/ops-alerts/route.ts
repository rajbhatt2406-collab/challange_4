import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGeminiModel } from '@/lib/gemini/client';
import { isAllowed } from '@/lib/gemini/rateLimiter';
import { Schema } from '@google/generative-ai';

// Known gate IDs from venueGraph — constrain to prevent prompt injection
const VALID_GATE_IDS = ['gate-a', 'gate-b', 'gate-c', 'gate-d'] as const;

const alertRequestSchema = z.object({
  gateId: z.enum(VALID_GATE_IDS),
  occupancy: z.number().min(0).max(100)
});

/**
 * Endpoint called when gate occupancy crosses safety thresholds.
 * Evaluates the safety hazard using Gemini structured analysis.
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
    body = alertRequestSchema.parse(rawBody);
  } catch (err) {
    // Security: return a generic message to avoid leaking internal schema details
    // (Zod v4 ZodError.message includes field paths and allowed enum values)
    void err;
    return NextResponse.json({ error: 'Invalid request parameters.' }, { status: 400 });
  }

  const { gateId, occupancy } = body;

  try {
    const model = getGeminiModel('gemini-1.5-flash');

    const alertSchema = {
      type: 'OBJECT',
      properties: {
        severity: {
          type: 'STRING',
          description: 'The classified severity of the crowd size. Must be low, medium, high, or critical.',
          enum: ['low', 'medium', 'high', 'critical']
        },
        message: {
          type: 'STRING',
          description: 'A 1-sentence warning message explaining the crowd level at the gate.'
        },
        recommended_action: {
          type: 'STRING',
          description: 'A clear operational action for stadium staff (e.g. divert fans, dispatch crowd control).'
        },
        confidence: {
          type: 'NUMBER',
          description: 'A confidence score between 0.0 and 1.0.'
        }
      },
      required: ['severity', 'message', 'recommended_action', 'confidence']
    } as unknown as Schema;

    const prompt = `Evaluate the crowd safety threat level for FIFA World Cup 2026.
    Gate: "${gateId}"
    Current occupancy: ${occupancy}%.
    If occupancy is under 80%, severity should be low.
    If occupancy is 80-89%, severity should be medium/high.
    If occupancy is 90% or higher, severity should be critical.
    Generate a warning message and recommended operational action.`;

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
    console.warn('Gemini evaluation failed (e.g. invalid key). Falling back to mock evaluator.', error);
    
    // Hardcoded safety limits representation (Fallback)
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let message = `Crowd size at gate ${gateId} is normal.`;
    let recommended_action = 'No dispatch action required.';

    if (occupancy >= 95) {
      severity = 'critical';
      message = `CRITICAL overcrowding alert at ${gateId}! Sensor reports ${occupancy}% occupancy.`;
      recommended_action = 'Deploy immediate crowd control team and open auxiliary emergency exits.';
    } else if (occupancy >= 85) {
      severity = 'high';
      message = `High crowd density warning at ${gateId} (${occupancy}% occupancy).`;
      recommended_action = 'Divert incoming spectators to adjacent gates B/C and post announcements.';
    } else if (occupancy >= 80) {
      severity = 'medium';
      message = `Moderate crowd size alert at ${gateId} (${occupancy}% occupancy).`;
      recommended_action = 'Monitor gate sensor feed and prepare secondary turnstiles.';
    }

    return NextResponse.json({
      severity,
      message,
      recommended_action,
      confidence: 0.99
    });
  }
}
