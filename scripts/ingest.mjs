#!/usr/bin/env node
/**
 * Local ingest: RSS → translate → merge/dedupe → src/data/intelligence/articles.json
 * Mirrors the Cloudflare Worker cron pipeline for static builds without D1.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchFeedItems } from './lib/rss.mjs';
import { translateToChinese } from './lib/translate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'ingest.config.json');
const outputPath = path.join(root, 'src/data/intelligence/articles.json');

function articleId(url) {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
    hash |= 0;
  }
  return `art_${Math.abs(hash).toString(36)}`;
}

function withinLookback(iso, lookbackDays) {
  if (!lookbackDays) return true;
  const published = new Date(iso).getTime();
  const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  return published >= cutoff;
}

async function loadConfig() {
  const raw = await readFile(configPath, 'utf8');
  return JSON.parse(raw);
}

async function loadExistingArticles() {
  try {
    const raw = await readFile(outputPath, 'utf8');
    const data = JSON.parse(raw);
    const articles = Array.isArray(data.articles) ? data.articles : [];
    return articles.filter((article) => !String(article.id).startsWith('seed_'));
  } catch {
    return [];
  }
}

export async function runIngest(options = {}) {
  const config = await loadConfig();
  const itemsPerFeed = options.itemsPerFeed ?? config.itemsPerFeed ?? 8;
  const lookbackDays = options.lookbackDays ?? config.lookbackDays ?? 90;
  const maxArticles = options.maxArticles ?? config.maxArticlesInExport ?? 120;
  const skipTranslate = options.skipTranslate ?? process.env.INGEST_SKIP_TRANSLATE === '1';
  const translateOptions = {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    preferMyMemory: process.env.INGEST_USE_MYMEMORY === '1',
  };

  const existingByUrl = new Map((await loadExistingArticles()).map((article) => [article.original_url, article]));

  const summary = {
    sourcesProcessed: 0,
    sourcesFailed: [],
    articlesFetched: 0,
    articlesTranslated: 0,
    articlesSkippedExisting: 0,
  };

  const ingestedAt = new Date().toISOString();

  for (const source of config.sources) {
    try {
      const items = await fetchFeedItems(source.feedUrl, itemsPerFeed);
      summary.sourcesProcessed += 1;

      const sourceLookback = source.lookbackDays ?? lookbackDays;

      for (const item of items) {
        if (!item.link || !item.title) continue;
        if (!withinLookback(item.publishedAt, sourceLookback)) continue;

        summary.articlesFetched += 1;

        if (existingByUrl.has(item.link)) {
          summary.articlesSkippedExisting += 1;
          continue;
        }

        let titleZh = item.title;
        let excerptZh = item.description || null;

        if (!skipTranslate) {
          titleZh = await translateToChinese(item.title, translateOptions);
          if (excerptZh) {
            excerptZh = await translateToChinese(excerptZh, translateOptions);
          }
          summary.articlesTranslated += 1;
        }

        existingByUrl.set(item.link, {
          id: articleId(item.link),
          source_id: source.id,
          source_name: source.name,
          original_title: item.title,
          title_zh: titleZh || item.title,
          excerpt_zh: excerptZh,
          original_url: item.link,
          published_at: item.publishedAt,
          ingested_at: ingestedAt,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`ingest: failed ${source.id}:`, message);
      summary.sourcesFailed.push(`${source.id}: ${message}`);
    }
  }

  const articles = [...existingByUrl.values()]
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .slice(0, maxArticles);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify({ articles, syncedAt: ingestedAt, ingestSummary: summary }, null, 2)}\n`
  );

  return { articles, summary };
}

async function main() {
  console.log('ingest: fetching RSS feeds and translating…');
  const { articles, summary } = await runIngest();
  console.log(
    `ingest: wrote ${articles.length} articles (${summary.articlesFetched} fetched, ${summary.articlesTranslated} translated, ${summary.articlesSkippedExisting} skipped as existing)`
  );
  if (summary.sourcesFailed.length) {
    console.warn('ingest: source failures:', summary.sourcesFailed.join('; '));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
