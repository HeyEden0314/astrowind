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
  { id: 'openai', name: 'OpenAI', url: 'https://openai.com/blog' },
  { id: 'anthropic', name: 'Anthropic', url: 'https://www.anthropic.com/news' },
  { id: 'cursor', name: 'Cursor', url: 'https://cursor.com/blog' },
  { id: 'xai', name: 'xAI', url: 'https://x.ai/blog' },
  { id: 'google-deepmind', name: 'Google DeepMind', url: 'https://deepmind.google/blog' },
  { id: 'meta-ai', name: 'Meta AI', url: 'https://ai.meta.com/blog' },
] as const;
