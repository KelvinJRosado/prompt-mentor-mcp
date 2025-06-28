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

/**
 * Review and provide feedback on user prompts using Gemini AI
 * @param prompts - Array of prompt strings to review
 * @param apiKey - The Gemini API key
 * @returns Promise<string> - Feedback and suggestions for prompt improvement
 */
export async function reviewPrompts(prompts: string[], apiKey: string): Promise<string> {
  const geminiClient = createGeminiClient(apiKey);

  const reviewPrompt = `You will be provided a list of chat messages that were sent as part of a conversation with an LLM. Your role is to be a mentor and provide feedback to the LLM user so that they learn ways to improve their prompts in the future. The goal is to educate the user about what makes an effective prompt, as well as point out mistakes being made in the given prompts. The prompts given by the user are as follows:

${prompts.map((prompt, index) => `${index + 1}. ${prompt}`).join('\n\n')}

Please provide constructive feedback, highlighting both strengths and areas for improvement in these prompts.`;

  const res = await geminiClient.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: reviewPrompt,
  });

  return res.text || 'No response from Gemini API';
}
