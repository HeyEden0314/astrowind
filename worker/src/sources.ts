export interface FeedSource {
  id: string;
  name: string;
  feedUrl: string;
}

/** Official RSS/Atom feeds from major AI labs and tools. */
export const FEED_SOURCES: FeedSource[] = [
  { id: 'openai', name: 'OpenAI', feedUrl: 'https://openai.com/blog/rss.xml' },
  { id: 'anthropic', name: 'Anthropic', feedUrl: 'https://www.anthropic.com/news/rss' },
  { id: 'cursor', name: 'Cursor', feedUrl: 'https://cursor.com/blog/rss.xml' },
  { id: 'xai', name: 'xAI', feedUrl: 'https://x.ai/blog/rss.xml' },
  { id: 'google-deepmind', name: 'Google DeepMind', feedUrl: 'https://deepmind.google/blog/rss.xml' },
  { id: 'meta-ai', name: 'Meta AI', feedUrl: 'https://ai.meta.com/blog/rss/' },
];
