/**
 * MAS RSS Scraper (Singapore)
 * Source: https://www.mas.gov.sg/rss
 */

import Parser from 'rss-parser';
import crypto from 'crypto';
import type { RegulatoryUpdate, ScrapeResult } from '../types.js';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'CryptoRegulatoryTracker/1.0',
  },
});

const MAS_FEEDS = [
  { url: 'https://www.mas.gov.sg/rss/news', name: 'News' },
  { url: 'https://www.mas.gov.sg/rss/media-releases', name: 'Media Releases' },
];

const CRYPTO_KEYWORDS = [
  'crypto', 'digital asset', 'digital payment token', 'dpt', 'blockchain',
  'stablecoin', 'defi', 'virtual asset', 'token', 'exchange',
];

function isPotentiallyCrypto(text: string): boolean {
  const lower = text.toLowerCase();
  return CRYPTO_KEYWORDS.some(kw => lower.includes(kw));
}

function hashContent(title: string, url: string): string {
  return crypto.createHash('sha256').update(`${title}|${url}`).digest('hex');
}

export async function scrapeMAS(): Promise<ScrapeResult> {
  const items: RegulatoryUpdate[] = [];
  const errors: string[] = [];

  for (const feed of MAS_FEEDS) {
    try {
      console.log(`[MAS] Fetching ${feed.name}...`);
      const result = await parser.parseURL(feed.url);

      for (const entry of result.items) {
        if (!entry.title || !entry.link) continue;

        const update: RegulatoryUpdate = {
          source: 'MAS',
          title: entry.title.trim(),
          summary: entry.contentSnippet?.slice(0, 500),
          source_url: entry.link,
          published_at: entry.pubDate ? new Date(entry.pubDate) : undefined,
          scraped_at: new Date(),
          content_hash: hashContent(entry.title, entry.link),
          is_crypto_related: isPotentiallyCrypto(entry.title + ' ' + (entry.contentSnippet || '')),
        };

        items.push(update);
      }

      console.log(`[MAS] Found ${result.items.length} items from ${feed.name}`);
    } catch (err) {
      const msg = `Failed to fetch ${feed.name}: ${err instanceof Error ? err.message : err}`;
      console.error(`[MAS] ${msg}`);
      errors.push(msg);
    }
  }

  const cryptoItems = items.filter(i => i.is_crypto_related);
  console.log(`[MAS] ${cryptoItems.length}/${items.length} items are crypto-related`);

  return { source: 'MAS', items: cryptoItems, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeMAS().then(r => console.log(JSON.stringify(r, null, 2)));
}
