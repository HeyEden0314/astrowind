CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  original_title TEXT NOT NULL,
  title_zh TEXT NOT NULL,
  excerpt_zh TEXT,
  original_url TEXT NOT NULL UNIQUE,
  published_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_published ON articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles (source_id);
