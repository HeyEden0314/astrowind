export interface Env {
  DB: D1Database;
  AI: Ai;
  DEPLOY_HOOK_URL?: string;
  INGEST_ITEMS_PER_FEED?: string;
}

export interface ParsedFeedItem {
  title: string;
  link: string;
  description: string;
  publishedAt: string;
}

export interface ArticleRow {
  id: string;
  source_id: string;
  source_name: string;
  original_title: string;
  title_zh: string;
  excerpt_zh: string | null;
  original_url: string;
  published_at: string;
  ingested_at: string;
}
