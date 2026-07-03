// Optional LLM polish for bot replies. Best-effort only: if there's no API
// key, the SDK call fails, or it's slow, callers fall back to the
// template-based formatter in formatters.js — the bot must never hang or
// break on this path.

import Anthropic from '@anthropic-ai/sdk';

// Swap to 'claude-haiku-4-5' if you want lower latency/cost for this
// trivial a rewrite job — either works fine here.
const MODEL = 'claude-opus-4-8';
const REQUEST_TIMEOUT_MS = 6000;

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

export async function humanize(factsText) {
  if (!client) return null;

  try {
    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 200,
        output_config: { effort: 'low' },
        messages: [
          {
            role: 'user',
            content:
              'Rewrite these office device facts as one short, friendly sentence ' +
              `for a Discord message. Do not invent numbers not given below.\n\n${factsText}`,
          },
        ],
      },
      { timeout: REQUEST_TIMEOUT_MS }
    );

    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock?.text?.trim() || null;
  } catch {
    return null;
  }
}
