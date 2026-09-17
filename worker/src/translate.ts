import type { Env } from './types';

const MAX_CHARS = 1200;
const MYMEMORY_DELAY_MS = 350;

let lastMyMemoryAt = 0;

function truncate(text: string, max = MAX_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translateWithM2M(env: Env, text: string): Promise<string> {
  const result: unknown = await env.AI.run('@cf/meta/m2m100-1.2b', {
    text: truncate(text),
    source_lang: 'english',
    target_lang: 'chinese',
  });
  if (typeof result === 'string') return result.trim();
  if (result && typeof result === 'object' && 'translated_text' in result) {
    const translated = (result as { translated_text: unknown }).translated_text;
    return String(translated ?? '').trim();
  }
  return String(result ?? '').trim();
}

async function translateWithLlm(env: Env, text: string): Promise<string> {
  const fallback = await env.AI.run('@cf/zai-org/glm-4.7-flash', {
    messages: [
      {
        role: 'system',
        content:
          'You are a professional translator. Translate the user text into Simplified Chinese (简体中文). Return only the translation, no quotes or explanation.',
      },
      { role: 'user', content: truncate(text) },
    ],
    max_tokens: 512,
  });

  if (fallback && typeof fallback === 'object' && 'response' in fallback) {
    return String((fallback as { response: string }).response).trim();
  }
  return String(fallback ?? text).trim();
}

async function translateWithMyMemory(text: string): Promise<string> {
  const elapsed = Date.now() - lastMyMemoryAt;
  if (elapsed < MYMEMORY_DELAY_MS) {
    await sleep(MYMEMORY_DELAY_MS - elapsed);
  }
  lastMyMemoryAt = Date.now();

  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', truncate(text, 500));
  url.searchParams.set('langpair', 'en|zh-CN');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MyMemory ${response.status}`);
  }
  const payload = (await response.json()) as {
    quotaFinished?: boolean;
    responseData?: { translatedText?: string };
  };
  if (payload.quotaFinished) {
    throw new Error('MyMemory daily quota finished');
  }
  const translated = payload.responseData?.translatedText?.trim();
  if (!translated) throw new Error('MyMemory empty response');
  return translated;
}

/** Translate to Simplified Chinese using Workers AI, with MyMemory fallback. */
export async function translateToChinese(env: Env, text: string): Promise<string> {
  const input = truncate(text);
  if (!input) return '';

  try {
    const translated = await translateWithM2M(env, input);
    if (translated) return translated;
  } catch (error) {
    console.warn('m2m100 translation failed, falling back to LLM prompt', error);
  }

  try {
    const translated = await translateWithLlm(env, input);
    if (translated) return translated;
  } catch (error) {
    console.warn('LLM translation failed, falling back to MyMemory', error);
  }

  return await translateWithMyMemory(input);
}
