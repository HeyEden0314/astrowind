import type { Env } from './types';

const MAX_CHARS = 1200;

function truncate(text: string, max = MAX_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

async function translateWithM2M(env: Env, text: string): Promise<string> {
  const result = await env.AI.run('@cf/meta/m2m100-1.2b', {
    text: truncate(text),
    source_lang: 'english',
    target_lang: 'chinese',
  });
  if (typeof result === 'string') return result.trim();
  if (result && typeof result === 'object' && 'translated_text' in result) {
    return String((result as { translated_text: string }).translated_text).trim();
  }
  return String(result ?? '').trim();
}

/** Translate to Simplified Chinese using Cloudflare Workers AI (free tier). */
export async function translateToChinese(env: Env, text: string): Promise<string> {
  const input = truncate(text);
  if (!input) return '';
  try {
    const translated = await translateWithM2M(env, input);
    if (translated) return translated;
  } catch (error) {
    console.warn('m2m100 translation failed, falling back to LLM prompt', error);
  }

  const fallback = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      {
        role: 'system',
        content:
          'You are a professional translator. Translate the user text into Simplified Chinese (简体中文). Return only the translation, no quotes or explanation.',
      },
      { role: 'user', content: input },
    ],
    max_tokens: 512,
  });

  if (fallback && typeof fallback === 'object' && 'response' in fallback) {
    return String((fallback as { response: string }).response).trim();
  }
  return String(fallback ?? input).trim();
}
