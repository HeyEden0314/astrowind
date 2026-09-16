export interface IntelligenceArticle {
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

export interface IntelligenceFeed {
  articles: IntelligenceArticle[];
  syncedAt?: string;
}
