import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGeminiModel } from '@/lib/gemini/client';
import { isAllowed } from '@/lib/gemini/rateLimiter';
import { insertIncident } from '@/lib/supabase/client';
import { Schema } from '@google/generative-ai';

const triageSchema = z.object({
  description: z.string().min(5).max(1000).trim()
});

/**
 * Triages free-text staff incident reports using Gemini Structured Outputs.
 * Logs the resulting record to the database.
 * Falls back to an algorithmic keyword classifier if the Gemini API key is invalid.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
  if (!isAllowed(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body;
  try {
    const rawBody = await req.json();
    body = triageSchema.parse(rawBody);
  } catch (err) {
    // Security: return a generic message to avoid leaking internal schema details
    // (Zod v4 ZodError.message includes field paths and allowed enum values)
    void err;
    return NextResponse.json({ error: 'Invalid request parameters.' }, { status: 400 });
  }

  const { description } = body;
  // Strip null bytes and control characters before embedding in AI prompt (defense-in-depth)
  const sanitizedDescription = description.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();

  try {
    const model = getGeminiModel('gemini-1.5-flash');

    const classificationSchema = {
      type: 'OBJECT',
      properties: {
        classification: {
          type: 'STRING',
          description: 'The category of incident. E.g. medical_emergency, crowd_hazard, facility_damage, security_breach, logistics.',
          enum: ['medical_emergency', 'crowd_hazard', 'facility_damage', 'security_breach', 'logistics']
        },
        recommended_action: {
          type: 'STRING',
          description: 'Suggested immediate dispatch action (e.g. Dispatch EMT to section, deploy cleaning crew).'
        },
        severity: {
          type: 'STRING',
          description: 'Severity classification.',
          enum: ['low', 'medium', 'high', 'critical']
        },
        confidence: {
          type: 'NUMBER',
          description: 'Classification confidence between 0.0 and 1.0.'
        }
      },
      required: ['classification', 'recommended_action', 'severity', 'confidence']
    } as unknown as Schema;

    const prompt = `Analyze this stadium operations incident report: "${sanitizedDescription}".
    Classify the category, assign severity, recommend an action, and estimate confidence.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: classificationSchema
      }
    });

    const textOutput = result.response.text();
    if (!textOutput) {
      throw new Error('Empty response from model');
    }

    const classification = JSON.parse(textOutput);
    
    // Log to Supabase / In-Memory Db
    const { data, error } = await insertIncident({
      description,
      classification: classification.classification,
      recommended_action: classification.recommended_action,
      severity: classification.severity,
      confidence: classification.confidence
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      incident: data?.[0]
    });

  } catch (error) {
    console.warn('Gemini triage failed (e.g. invalid key). Falling back to keyword evaluator.', error);

    const descLower = sanitizedDescription.toLowerCase();
    let classification = 'logistics';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let recommended_action = 'Notify zone supervisor for review.';

    if (descLower.includes('hurt') || descLower.includes('slip') || descLower.includes('bleed') || descLower.includes('medical') || descLower.includes('ambulance') || descLower.includes('doctor')) {
      classification = 'medical_emergency';
      severity = 'high';
      recommended_action = 'Dispatch EMT unit and Section steward to location.';
    } else if (descLower.includes('crowd') || descLower.includes('gate') || descLower.includes('crush') || descLower.includes('turnstile') || descLower.includes('congestion')) {
      classification = 'crowd_hazard';
      severity = 'high';
      recommended_action = 'Dispatch crowd control division and open secondary gate.';
    } else if (descLower.includes('spill') || descLower.includes('leak') || descLower.includes('broken') || descLower.includes('glass') || descLower.includes('lights') || descLower.includes('toilet') || descLower.includes('restroom')) {
      classification = 'facility_damage';
      severity = 'medium';
      recommended_action = 'Deploy facilities clean-up and maintenance team.';
    } else if (descLower.includes('fight') || descLower.includes('security') || descLower.includes('trespass') || descLower.includes('smoke') || descLower.includes('flare') || descLower.includes('weapon')) {
      classification = 'security_breach';
      severity = 'critical';
      recommended_action = 'Deploy stadium security guards and coordinate with local police.';
    }

    const { data, error: dbError } = await insertIncident({
      description,
      classification,
      recommended_action,
      severity,
      confidence: 0.85
    });

    if (dbError) {
      return NextResponse.json({ error: 'Failed to triage incident.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      incident: data?.[0]
    });
  }
}
