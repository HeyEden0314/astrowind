import { FEED_SOURCES, getItemsPerFeed, INGEST_LOOKBACK_DAYS, type FeedSource } from './sources';
import { fetchFeedItems } from './rss';
import { translateToChinese } from './translate';
import type { Env } from './types';

function articleId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
    hash |= 0;
  }
  return `art_${Math.abs(hash).toString(36)}`;
}

export interface IngestSummary {
  sourcesProcessed: number;
  sourcesFailed: string[];
  articlesInserted: number;
  articlesSkipped: number;
}

const SOURCE_LOOKBACK_DAYS: Partial<Record<string, number>> = {
  cursor: 3650,
  xai: 180,
};

function sourceLookbackDays(source: FeedSource): number {
  return SOURCE_LOOKBACK_DAYS[source.id] ?? INGEST_LOOKBACK_DAYS;
}

function withinLookback(iso: string, lookbackDays: number): boolean {
  const published = new Date(iso).getTime();
  const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  return published >= cutoff;
}

export async function runIngest(env: Env, itemsPerFeed = getItemsPerFeed(env)): Promise<IngestSummary> {
  const summary: IngestSummary = {
    sourcesProcessed: 0,
    sourcesFailed: [],
    articlesInserted: 0,
    articlesSkipped: 0,
  };

  for (const source of FEED_SOURCES) {
    try {
      const items = await fetchFeedItems(source.feedUrl, itemsPerFeed);
      summary.sourcesProcessed += 1;

      for (const item of items) {
        if (!withinLookback(item.publishedAt, sourceLookbackDays(source))) continue;

        const existing = await env.DB.prepare('SELECT id FROM articles WHERE original_url = ?')
          .bind(item.link)
          .first<{ id: string }>();

        if (existing) {
          summary.articlesSkipped += 1;
          continue;
        }

        const titleZh = await translateToChinese(env, item.title);
        const excerptSource = item.description || item.title;
        const excerptZh = excerptSource ? await translateToChinese(env, excerptSource) : null;
        const now = new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO articles (
            id, source_id, source_name, original_title, title_zh, excerpt_zh,
            original_url, published_at, ingested_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            articleId(item.link),
            source.id,
            source.name,
            item.title,
            titleZh || item.title,
            excerptZh,
            item.link,
            item.publishedAt,
            now
          )
          .run();

        summary.articlesInserted += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to ingest ${source.id}:`, message);
      summary.sourcesFailed.push(`${source.id}: ${message}`);
    }
  }

  return summary;
}

export async function listArticles(env: Env, limit = 100): Promise<unknown[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, source_id, source_name, original_title, title_zh, excerpt_zh,
            original_url, published_at, ingested_at
     FROM articles
     ORDER BY published_at DESC
     LIMIT ?`
  )
    .bind(limit)
    .all();

  return results ?? [];
}
