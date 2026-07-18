import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    'WARNING: GEMINI_API_KEY is not defined. GenAI features will fail unless the environment variable is configured.'
  );
}

export const genAI = new GoogleGenerativeAI(apiKey || 'MOCK_KEY');

/**
 * Helper to get the correct Gemini model.
 * We use the recommended modern model for fast responses.
 */
export function getGeminiModel(modelName = 'gemini-1.5-flash') {
  return genAI.getGenerativeModel({ model: modelName });
}


