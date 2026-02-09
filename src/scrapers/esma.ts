/**
 * ESMA RSS Scraper (EU - MiCA)
 * Source: https://www.esma.europa.eu/press-news/esma-news
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

const ESMA_FEED = 'https://www.esma.europa.eu/press-news/esma-news/feed';

const CRYPTO_KEYWORDS = [
  'crypto', 'digital asset', 'mica', 'dlt', 'blockchain', 'token',
  'stablecoin', 'defi', 'virtual asset', 'distributed ledger',
];

function isPotentiallyCrypto(text: string): boolean {
  const lower = text.toLowerCase();
  return CRYPTO_KEYWORDS.some(kw => lower.includes(kw));
}

function hashContent(title: string, url: string): string {
  return crypto.createHash('sha256').update(`${title}|${url}`).digest('hex');
}

export async function scrapeESMA(): Promise<ScrapeResult> {
  const items: RegulatoryUpdate[] = [];
  const errors: string[] = [];

  try {
    console.log('[ESMA] Fetching feed...');
    const result = await parser.parseURL(ESMA_FEED);

    for (const entry of result.items) {
      if (!entry.title || !entry.link) continue;

      const update: RegulatoryUpdate = {
        source: 'ESMA',
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

    console.log(`[ESMA] Found ${items.length} items`);
  } catch (err) {
    const msg = `Failed to fetch ESMA: ${err instanceof Error ? err.message : err}`;
    console.error(`[ESMA] ${msg}`);
    errors.push(msg);
  }

  const cryptoItems = items.filter(i => i.is_crypto_related);
  console.log(`[ESMA] ${cryptoItems.length}/${items.length} items are crypto-related`);

  return { source: 'ESMA', items: cryptoItems, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeESMA().then(r => console.log(JSON.stringify(r, null, 2)));
}
