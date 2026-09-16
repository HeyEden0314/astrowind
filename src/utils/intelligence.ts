import type { IntelligenceArticle, IntelligenceFeed } from '~/types/intelligence';
import articlesData from '~/data/intelligence/articles.json';

let cachedArticles: IntelligenceArticle[] | null = null;

export function getIntelligenceArticles(): IntelligenceArticle[] {
  if (cachedArticles) return cachedArticles;
  const feed = articlesData as IntelligenceFeed;
  cachedArticles = [...(feed.articles ?? [])].sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
  return cachedArticles;
}

export function formatChineseDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Shanghai',
  });
}

export const INTELLIGENCE_SOURCES = [
  { id: 'openai', name: 'OpenAI', url: 'https://openai.com/news' },
  { id: 'anthropic', name: 'Anthropic', url: 'https://www.anthropic.com/news' },
  { id: 'cursor', name: 'Cursor', url: 'https://cursor.com/blog' },
  { id: 'xai', name: 'xAI', url: 'https://x.ai/news' },
  { id: 'google-deepmind', name: 'Google DeepMind', url: 'https://deepmind.google/blog' },
  { id: 'meta-ai', name: 'Meta AI', url: 'https://ai.meta.com/blog' },
  { id: 'google-ai', name: 'Google AI', url: 'https://blog.google/technology/ai/' },
] as const;

/** Gradient classes for source cover placeholders (inspired by editorial card layouts). */
export const SOURCE_GRADIENTS: Record<string, string> = {
  openai: 'from-emerald-600 via-teal-600 to-cyan-800',
  anthropic: 'from-orange-500 via-amber-500 to-orange-700',
  cursor: 'from-violet-600 via-purple-600 to-indigo-800',
  xai: 'from-gray-700 via-gray-800 to-black',
  'google-deepmind': 'from-blue-600 via-indigo-600 to-blue-800',
  'meta-ai': 'from-sky-500 via-blue-600 to-blue-800',
  'google-ai': 'from-red-500 via-rose-500 to-orange-600',
};

export function getSourceGradient(sourceId: string): string {
  return SOURCE_GRADIENTS[sourceId] ?? 'from-slate-600 via-slate-700 to-slate-900';
}

export function articleSearchText(article: IntelligenceArticle): string {
  return [article.title_zh, article.original_title, article.excerpt_zh ?? '', article.source_name, article.source_id]
    .join(' ')
    .toLowerCase();
}
