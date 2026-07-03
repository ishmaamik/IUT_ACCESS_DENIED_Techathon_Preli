// Optional LLM polish for bot replies. Best-effort only: if there's no API
// key, the SDK call fails, or it's slow, callers fall back to the
// template-based formatter in formatters.js — the bot must never hang or
// break on this path.

import { GoogleGenAI } from '@google/genai';

const MODEL = 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 6000;

const client = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

export async function humanize(factsText) {
  if (!client) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await client.models.generateContent(
      {
        model: MODEL,
        contents:
          'Rewrite these office device facts as one short, friendly sentence ' +
          `for a Discord message. Do not invent numbers not given below.\n\n${factsText}`,
        // gemini-2.5-flash spends part of this budget on hidden "thinking"
        // tokens before the visible reply, so keep this well above the
        // actual reply length or the response gets cut off mid-sentence.
        config: { maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
      },
      { signal: controller.signal }
    );

    clearTimeout(timer);
    return response.text?.trim() || null;
  } catch {
    return null;
  }
}

// Free-form chat, unlike humanize() this isn't grounded in office data — it's
// a general assistant. Returns null (caller shows an error) if there's no
// key, the call fails, or it's slow.
export async function chat(question) {
  if (!client) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await client.models.generateContent(
      {
        model: MODEL,
        contents: question,
        config: {
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingBudget: 0 },
          systemInstruction:
            'You are a helpful assistant chatting inside a Discord server for an ' +
            'office energy-monitoring project. Keep answers concise and Discord-friendly.',
        },
      },
      { signal: controller.signal }
    );

    clearTimeout(timer);
    return response.text?.trim() || null;
  } catch {
    return null;
  }
}
