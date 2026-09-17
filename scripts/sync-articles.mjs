#!/usr/bin/env node
/**
 * Sync articles into src/data/intelligence/articles.json before build.
 * 1. ARTICLES_API_URL → pull from deployed Worker / D1 API
 * 2. else → run local RSS ingest (scripts/ingest.mjs)
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const apiUrl = process.env.ARTICLES_API_URL;

function resolveArticlesUrl(rawUrl) {
  const trimmed = rawUrl.trim().replace(/\/$/, '');
  if (trimmed.includes('?')) return trimmed;
  if (/\/api\/articles$/i.test(trimmed)) {
    return `${trimmed}?limit=120`;
  }
  return `${trimmed}/api/articles?limit=120`;
}

async function fetchRemote() {
  if (!apiUrl) return null;
  const url = resolveArticlesUrl(apiUrl);
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Articles API ${response.status}: ${await response.text()}`);
  }
  const payload = await response.json();
  return Array.isArray(payload.articles) ? payload.articles : [];
}

function runLocalIngest() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, 'ingest.mjs')], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ingest.mjs exited with code ${code}`));
    });
  });
}

async function main() {
  try {
    const remote = await fetchRemote();
    if (remote && remote.length > 0) {
      const { writeFile, mkdir } = await import('node:fs/promises');
      const outputPath = path.join(root, 'src/data/intelligence/articles.json');
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(
        outputPath,
        `${JSON.stringify({ articles: remote, syncedAt: new Date().toISOString() }, null, 2)}\n`
      );
      console.log(`sync-articles: wrote ${remote.length} articles from Worker API`);
      return;
    }
  } catch (error) {
    console.warn(
      'sync-articles: Worker API unavailable, running local ingest —',
      error instanceof Error ? error.message : error
    );
  }

  await runLocalIngest();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
