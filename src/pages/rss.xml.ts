import rss from '@astrojs/rss';
import { SITE, METADATA } from 'astrowind:config';
import { getIntelligenceArticles } from '~/utils/intelligence';

export async function GET() {
  const articles = getIntelligenceArticles();

  return rss({
    title: SITE?.name ?? 'AI 中文情报站',
    description: METADATA?.description ?? '',
    site: SITE?.site ?? 'https://example.com',
    items: articles.map((article) => ({
      title: article.title_zh,
      description: article.excerpt_zh ?? article.original_title,
      pubDate: new Date(article.published_at),
      link: article.original_url,
    })),
    customData: `<language>zh-CN</language>`,
  });
}
