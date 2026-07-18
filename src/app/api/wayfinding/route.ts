import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGeminiModel } from '@/lib/gemini/client';
import { sanitizeError } from '@/lib/gemini/sanitize';
import { isAllowed } from '@/lib/gemini/rateLimiter';
import { VENUE_NODES } from '@/features/wayfinding/venueGraph';
import { Schema } from '@google/generative-ai';

const requestSchema = z.object({
  query: z.string().min(1).max(500),
  // Constrain startNode to known venue node IDs to prevent prompt injection
  startNode: z.string().default('gate-a').refine(
    (val) => VENUE_NODES.some(n => n.id === val),
    { message: 'Invalid startNode: must be a known venue node ID' }
  )
});

/**
 * Handles wayfinding concierge chat queries.
 * Validates inputs, checks rate limits, calls Gemini with Function Calling,
 * extracts structured metadata, and streams the translated response.
 * Falls back to keyword parsing and local streams if the Gemini API key is missing.
 */
export async function POST(req: NextRequest) {
  // 1. Rate Limiting
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
  if (!isAllowed(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  // 2. Input Validation
  let body;
  try {
    const rawBody = await req.json();
    body = requestSchema.parse(rawBody);
  } catch (err) {
    // Security: return a generic message to avoid leaking internal schema details
    // (Zod v4 ZodError.message includes field paths and allowed enum values)
    void err;
    return NextResponse.json({ error: 'Invalid request parameters.' }, { status: 400 });
  }

  const { query, startNode } = body;
  // Strip null bytes and control characters before embedding in AI prompt (defense-in-depth)
  const sanitizedQuery = query.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();

  try {
    // 3. Gemini Function Calling to resolve destination node and intent
    const classificationModel = getGeminiModel('gemini-1.5-flash');
    
    const responseSchema = {
      type: 'OBJECT',
      properties: {
        intent: {
          type: 'STRING',
          description: 'The user intent. Must be: FIND_RESTROOM, FIND_GATE, FIND_FOOD, FIND_MEDICAL, or HELP.',
          enum: ['FIND_RESTROOM', 'FIND_GATE', 'FIND_FOOD', 'FIND_MEDICAL', 'HELP']
        },
        destination_id: {
          type: 'STRING',
          description: 'The matched venue node ID from the list: gate-a, gate-b, gate-c, gate-d, restroom-n1, restroom-acc-s1, restroom-e1, restroom-w1, food-taco, food-burger, food-drinks, medical-east, medical-west. Pick the closest match based on the question.',
          enum: VENUE_NODES.map(n => n.id)
        },
        language_detected: {
          type: 'STRING',
          description: 'The detected language code (e.g. es, en, fr, de, pt).'
        },
        translated_response: {
          type: 'STRING',
          description: 'A brief welcome/guidance phrase translated to the detected language. (e.g., "¡Claro! Te mostraré el camino al baño accesible más cercano...").'
        }
      },
      required: ['intent', 'destination_id', 'language_detected', 'translated_response']
    } as unknown as Schema;

    const prompt = `User is at start node "${startNode}".
    
    [START OF USER QUERY]
    ${sanitizedQuery}
    [END OF USER QUERY]
    
    Classify their intent and map it to the closest venue destination ID in our stadium map.
    Provide the response in the user's language.`;

    const result = await classificationModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema
      }
    });

    const textOutput = result.response.text();
    if (!textOutput) {
      throw new Error('Empty classification from model');
    }

    const parsedJson = JSON.parse(textOutput);
    const { intent, destination_id, language_detected, translated_response } = parsedJson;

    // 4. Stream detailed directions token-by-token
    const streamingModel = getGeminiModel('gemini-1.5-flash');
    const streamPrompt = `You are a friendly World Cup 2026 stadium wayfinding helper.
    The user is asking a query:
    [START OF USER QUERY]
    ${sanitizedQuery}
    [END OF USER QUERY]
    
    Additional Context:
    - Detected language: ${language_detected}
    - Classified intent: ${intent}
    - Destination node: "${destination_id}" (described as: "${VENUE_NODES.find(n => n.id === destination_id)?.description}")
    
    Write a short, friendly guiding response (2-3 sentences max) in the language "${language_detected}".
    Start directly with the directions, beginning with: "${translated_response}". Do not add markdown or headers.`;

    const streamResult = await streamingModel.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: streamPrompt }] }]
    });

    // Create a readable stream to pipe Gemini's tokens to the client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResult.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      }
    });

    // 5. Send back the response with metadata headers and text stream body
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'x-intent': intent || '',
        'x-destination-id': destination_id || '',
        'x-language-detected': language_detected || ''
      }
    });

  } catch (error) {
    console.warn('Gemini wayfinding failed (e.g. invalid key). Falling back to keyword search.', sanitizeError(error));

    const queryLower = sanitizedQuery.toLowerCase();
    let intent = 'HELP';
    let destination_id = 'gate-a';
    let language_detected = 'en';
    let translated_response = 'Checking directions...';

    // Detect language
    if (queryLower.includes('dónde') || queryLower.includes('baño') || queryLower.includes('entrada') || queryLower.includes('tacos')) {
      language_detected = 'es';
      translated_response = '¡Por supuesto! Déjame buscar el camino...';
    } else if (queryLower.includes('où') || queryLower.includes('toilette') || queryLower.includes('porte') || queryLower.includes('s\'il vous plaît')) {
      language_detected = 'fr';
      translated_response = 'Bien sûr! Laissez-moi trouver l\'itinéraire...';
    } else if (queryLower.includes('gostaria') || queryLower.includes('onde') || queryLower.includes('fica') || queryLower.includes('portão')) {
      language_detected = 'pt';
      translated_response = 'Com certeza! Deixe-me encontrar o caminho...';
    }

    // Detect destination
    if (queryLower.includes('bath') || queryLower.includes('restroom') || queryLower.includes('baño') || queryLower.includes('toilet') || queryLower.includes('toilette') || queryLower.includes('wc')) {
      intent = 'FIND_RESTROOM';
      destination_id = queryLower.includes('accessible') || queryLower.includes('accesible') || queryLower.includes('neutral') ? 'restroom-acc-s1' : 'restroom-n1';
    } else if (queryLower.includes('taco') || queryLower.includes('food') || queryLower.includes('burger') || queryLower.includes('drink') || queryLower.includes('beer') || queryLower.includes('comer') || queryLower.includes('acheter')) {
      intent = 'FIND_FOOD';
      destination_id = queryLower.includes('taco') ? 'food-taco' : queryLower.includes('burger') ? 'food-burger' : 'food-drinks';
    } else if (queryLower.includes('medical') || queryLower.includes('first aid') || queryLower.includes('doctor') || queryLower.includes('help') || queryLower.includes('medecin') || queryLower.includes('médico')) {
      intent = 'FIND_MEDICAL';
      destination_id = 'medical-east';
    } else if (queryLower.includes('gate d') || queryLower.includes('portão d') || queryLower.includes('porte d')) {
      intent = 'FIND_GATE';
      destination_id = 'gate-d';
    } else if (queryLower.includes('gate b') || queryLower.includes('porte b')) {
      intent = 'FIND_GATE';
      destination_id = 'gate-b';
    } else if (queryLower.includes('gate c') || queryLower.includes('porte c')) {
      intent = 'FIND_GATE';
      destination_id = 'gate-c';
    }

    // Create stream
    const destNode = VENUE_NODES.find(n => n.id === destination_id);
    const destName = destNode?.name || destination_id;
    const destDesc = destNode?.description || '';

    let fallbackText = '';
    if (language_detected === 'es') {
      fallbackText = `${translated_response} He trazado una ruta desde tu ubicación hasta ${destName}. ${destDesc}. Por favor, sigue la guía en el mapa de estadio.`;
    } else if (language_detected === 'fr') {
      fallbackText = `${translated_response} J'ai calculé un itinéraire vers ${destName}. ${destDesc}. Suivez les panneaux verts sur le plan.`;
    } else if (language_detected === 'pt') {
      fallbackText = `${translated_response} Tracei uma rota em direção a ${destName}. ${destDesc}. Siga as instruções do mapa.`;
    } else {
      fallbackText = `${translated_response} I have computed a route from your start node to ${destName}. ${destDesc}. Please follow the green stadium scoreboard signage.`;
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(fallbackText));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'x-intent': intent,
        'x-destination-id': destination_id,
        'x-language-detected': language_detected
      }
    });
  }
}
