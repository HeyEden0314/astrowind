import { runIngest, listArticles } from './ingest';
import type { Env } from './types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders },
  });
}

async function triggerDeployHook(env: Env): Promise<void> {
  if (!env.DEPLOY_HOOK_URL) return;
  try {
    const response = await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
    if (!response.ok) {
      console.warn('Deploy hook failed', response.status, await response.text());
    }
  } catch (error) {
    console.warn('Deploy hook error', error);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/api/health') {
      return json({ ok: true, service: 'ai-intelligence-ingest' });
    }

    if (url.pathname === '/api/articles' && request.method === 'GET') {
      const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 200);
      const articles = await listArticles(env, limit);
      return json({ articles, count: articles.length });
    }

    if (url.pathname === '/api/ingest' && request.method === 'POST') {
      const summary = await runIngest(env);
      await triggerDeployHook(env);
      return json({ ok: true, summary });
    }

    return json({ error: 'Not found' }, 404);
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const summary = await runIngest(env);
    console.log('Scheduled ingest complete', JSON.stringify(summary));
    await triggerDeployHook(env);
  },
};
