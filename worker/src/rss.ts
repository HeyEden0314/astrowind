import { XMLParser } from 'fast-xml-parser';
import type { ParsedFeedItem } from './types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && value !== null) {
    if ('#text' in value) return text((value as { '#text': unknown })['#text']);
    if ('@_href' in value) return text((value as { '@_href': unknown })['@_href']);
  }
  return String(value).trim();
}

function resolveLink(item: Record<string, unknown>): string {
  const link = item.link;
  if (typeof link === 'string') return link.trim();
  if (Array.isArray(link)) {
    const alternate = link.find(
      (entry) => typeof entry === 'object' && entry !== null && (entry as { '@_rel'?: string })['@_rel'] === 'alternate'
    );
    if (alternate) return text(alternate);
    return text(link[0]);
  }
  if (typeof link === 'object' && link !== null) return text(link);
  const guid = item.guid;
  if (typeof guid === 'string' && guid.startsWith('http')) return guid.trim();
  return text(guid);
}

function parseDate(raw: unknown): string {
  const value = text(raw);
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function stripHtml(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRssItems(channel: Record<string, unknown>): ParsedFeedItem[] {
  return asArray(channel.item as Record<string, unknown> | Record<string, unknown>[]).map((item) => ({
    title: stripHtml(text(item.title)),
    link: resolveLink(item),
    description: stripHtml(text(item.description ?? item.summary ?? item['content:encoded'])),
    publishedAt: parseDate(item.pubDate ?? item.published ?? item.updated),
  }));
}

function parseAtomEntries(feed: Record<string, unknown>): ParsedFeedItem[] {
  return asArray(feed.entry as Record<string, unknown> | Record<string, unknown>[]).map((entry) => ({
    title: stripHtml(text(entry.title)),
    link: resolveLink(entry),
    description: stripHtml(text(entry.summary ?? entry.content)),
    publishedAt: parseDate(entry.published ?? entry.updated),
  }));
}

export function parseFeed(xml: string): ParsedFeedItem[] {
  const doc = parser.parse(xml) as Record<string, unknown>;
  const rss = doc.rss as { channel?: Record<string, unknown> } | undefined;
  if (rss?.channel) {
    return parseRssItems(rss.channel).filter((item) => item.title && item.link);
  }
  const feed = doc.feed as Record<string, unknown> | undefined;
  if (feed) {
    return parseAtomEntries(feed).filter((item) => item.title && item.link);
  }
  return [];
}

export async function fetchFeedItems(feedUrl: string, limit = 8): Promise<ParsedFeedItem[]> {
  const response = await fetch(feedUrl, {
    headers: {
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      'User-Agent': 'AI-Intelligence-Bot/1.0 (+https://github.com/HeyEden0314/astrowind)',
    },
  });
  if (!response.ok) {
    throw new Error(`Feed ${feedUrl} returned ${response.status}`);
  }
  const xml = await response.text();
  return parseFeed(xml).slice(0, limit);
}
