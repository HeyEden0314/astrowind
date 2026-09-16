import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
});

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && value !== null) {
    if ('#text' in value) return text(value['#text']);
    if ('@_href' in value) return text(value['@_href']);
  }
  return String(value).trim();
}

function resolveLink(item) {
  const link = item.link;
  if (typeof link === 'string') return link.trim();
  if (Array.isArray(link)) {
    const alternate = link.find(
      (entry) => typeof entry === 'object' && entry !== null && entry['@_rel'] === 'alternate'
    );
    if (alternate) return text(alternate);
    const first = link[0];
    if (first) return text(first);
  }
  if (typeof link === 'object' && link !== null) return text(link);
  const id = item.id;
  if (typeof id === 'string' && id.startsWith('http')) return id.trim();
  const guid = item.guid;
  if (typeof guid === 'string' && guid.startsWith('http')) return guid.trim();
  if (typeof guid === 'object' && guid !== null && '#text' in guid) {
    const guidText = text(guid['#text']);
    if (guidText.startsWith('http')) return guidText;
  }
  return text(guid ?? id);
}

function parseDate(raw) {
  const value = text(raw);
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function stripHtml(html) {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRssItems(channel) {
  return asArray(channel.item).map((item) => ({
    title: stripHtml(text(item.title)),
    link: resolveLink(item),
    description: stripHtml(text(item.description ?? item.summary ?? item['content:encoded'])),
    publishedAt: parseDate(item.pubDate ?? item.published ?? item.updated),
  }));
}

function parseAtomEntries(feed) {
  return asArray(feed.entry).map((entry) => ({
    title: stripHtml(text(entry.title)),
    link: resolveLink(entry),
    description: stripHtml(text(entry.summary ?? entry.content)),
    publishedAt: parseDate(entry.published ?? entry.updated),
  }));
}

export function parseFeed(xml) {
  const doc = parser.parse(xml);
  if (doc.rss?.channel) {
    return parseRssItems(doc.rss.channel).filter((item) => item.title && item.link);
  }
  if (doc.feed) {
    return parseAtomEntries(doc.feed).filter((item) => item.title && item.link);
  }
  return [];
}

export async function fetchFeedItems(feedUrl, limit = 8) {
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
