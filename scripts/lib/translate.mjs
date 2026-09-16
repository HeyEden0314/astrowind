const MAX_CHARS = 1200;
const MYMEMORY_DELAY_MS = 350;

function truncate(text, max = MAX_CHARS) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function translateWithCloudflareAI(text, accountId, token) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/m2m100-1.2b`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: truncate(text),
        source_lang: 'english',
        target_lang: 'chinese',
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`Workers AI ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  const result = payload.result;
  if (typeof result === 'string') return result.trim();
  if (result && typeof result === 'object' && 'translated_text' in result) {
    return String(result.translated_text).trim();
  }
  return String(result ?? '').trim();
}

async function translateWithMyMemory(text) {
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', truncate(text, 500));
  url.searchParams.set('langpair', 'en|zh-CN');
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MyMemory ${response.status}`);
  }
  const payload = await response.json();
  if (payload.quotaFinished) {
    throw new Error('MyMemory daily quota finished');
  }
  const translated = payload.responseData?.translatedText?.trim();
  if (!translated) throw new Error('MyMemory empty response');
  return translated;
}

let lastMyMemoryAt = 0;

async function translateToChinese(text, options = {}) {
  const input = truncate(text);
  if (!input) return '';

  const { accountId, apiToken, preferMyMemory = false } = options;

  if (!preferMyMemory && accountId && apiToken) {
    try {
      return await translateWithCloudflareAI(input, accountId, apiToken);
    } catch (error) {
      console.warn('Workers AI failed, falling back to MyMemory:', error instanceof Error ? error.message : error);
    }
  }

  const elapsed = Date.now() - lastMyMemoryAt;
  if (elapsed < MYMEMORY_DELAY_MS) {
    await sleep(MYMEMORY_DELAY_MS - elapsed);
  }
  lastMyMemoryAt = Date.now();
  return await translateWithMyMemory(input);
}

export { translateToChinese };
