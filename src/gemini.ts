import { GoogleGenAI } from '@google/genai';

/**
 * Initialize Gemini AI client with the provided API key
 * @param apiKey - The Gemini API key (GEMINI_API_KEY)
 * @returns GoogleGenAI instance
 */
export function createGeminiClient(apiKey: string): GoogleGenAI {
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new Error(
      'GEMINI_API_KEY is required and must be a non-empty string'
    );
  }

  return new GoogleGenAI({
    apiKey: apiKey.trim(),
  });
}

/**
 * Test connectivity to Gemini API
 * @param apiKey - The Gemini API key to test
 * @returns Promise<void>
 */
export async function testConnectivity(apiKey: string): Promise<string> {
  const geminiClient = createGeminiClient(apiKey);

  const res = await geminiClient.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Explain how AI works in a few words',
  });

  return res.text || 'No response from Gemini API';
}
