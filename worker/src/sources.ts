export interface FeedSource {
  id: string;
  name: string;
  feedUrl: string;
  official?: boolean;
  mirrorNote?: string;
}

/** Default items fetched per source on each cron run (override with INGEST_ITEMS_PER_FEED). */
export const DEFAULT_ITEMS_PER_FEED = 8;

/** Lookback window in days — older feed items are ignored. */
export const INGEST_LOOKBACK_DAYS = 90;

/**
 * RSS/Atom sources. Official feeds where available; community mirrors documented for
 * vendors without public RSS (Anthropic, Meta AI, xAI). See ingest.config.json.
 */
export const FEED_SOURCES: FeedSource[] = [
  { id: 'openai', name: 'OpenAI', feedUrl: 'https://openai.com/news/rss.xml', official: true },
  {
    id: 'anthropic',
    name: 'Anthropic',
    feedUrl: 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml',
    official: false,
    mirrorNote: 'Anthropic 无官方 RSS；社区镜像',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    feedUrl: 'https://cursor.com/atom.xml',
    official: true,
    mirrorNote: '官方 Atom 更新较慢',
  },
  {
    id: 'xai',
    name: 'xAI',
    feedUrl: 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_xainews.xml',
    official: false,
    mirrorNote: 'x.ai 无公开 RSS；社区镜像',
  },
  {
    id: 'google-deepmind',
    name: 'Google DeepMind',
    feedUrl: 'https://deepmind.google/blog/rss.xml',
    official: true,
  },
  {
    id: 'meta-ai',
    name: 'Meta AI',
    feedUrl: 'https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_meta_ai.xml',
    official: false,
    mirrorNote: 'Meta AI 无官方 RSS；社区镜像',
  },
  { id: 'google-ai', name: 'Google AI', feedUrl: 'https://blog.google/technology/ai/rss/', official: true },
];

export function getItemsPerFeed(env?: { INGEST_ITEMS_PER_FEED?: string }): number {
  const parsed = Number(env?.INGEST_ITEMS_PER_FEED);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 20) : DEFAULT_ITEMS_PER_FEED;
}
