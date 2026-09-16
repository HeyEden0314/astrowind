#!/usr/bin/env node
/**
 * Pulls articles from the ingest Worker API into src/data/intelligence/articles.json
 * before `astro build`. Falls back to the committed seed file when the API is unreachable.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outputPath = path.join(root, 'src/data/intelligence/articles.json');
const apiUrl = process.env.ARTICLES_API_URL;

async function loadExisting() {
  try {
    const raw = await readFile(outputPath, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data.articles) ? data.articles : [];
  } catch {
    return [];
  }
}

async function fetchRemote() {
  if (!apiUrl) return null;
  const url = apiUrl.includes('?') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api/articles?limit=120`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Articles API ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  return Array.isArray(payload.articles) ? payload.articles : [];
}

async function main() {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const existing = await loadExisting();

  try {
    const remote = await fetchRemote();
    if (remote && remote.length > 0) {
      await writeFile(
        outputPath,
        `${JSON.stringify({ articles: remote, syncedAt: new Date().toISOString() }, null, 2)}\n`
      );
      console.log(`sync-articles: wrote ${remote.length} articles from API`);
      return;
    }
  } catch (error) {
    console.warn(
      'sync-articles: API unavailable, using existing seed data —',
      error instanceof Error ? error.message : error
    );
  }

  if (existing.length > 0) {
    console.log(`sync-articles: keeping ${existing.length} seed articles`);
    return;
  }

  throw new Error('No articles available. Commit seed data or set ARTICLES_API_URL.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
